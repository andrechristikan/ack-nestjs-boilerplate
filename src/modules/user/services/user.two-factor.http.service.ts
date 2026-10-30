import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type {
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import type {
    IUser,
    IUserRecipient,
    IUserTwoFactorSetup,
} from '@modules/user/interfaces/user.interface';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorHttpService {
    constructor(
        private readonly userTwoFactorDomain: UserTwoFactorDomain,
        private readonly userDomain: UserDomain,
        private readonly authTwoFactorDomain: AuthTwoFactorDomain,
        private readonly roleDomain: RoleDomain,
        private readonly sessionDomain: SessionDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly notificationDomain: NotificationDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly sessionQueue: SessionQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationUtil: NotificationUtil,
        private readonly userUtil: UserUtil,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    private async getRecipient(
        user: IUserRecipient,
        kind: EnumNotificationKind
    ): Promise<INotificationRecipient> {
        const [ownerships, settings] = await Promise.all([
            this.deviceDomain.getOwnershipsWithNotificationToken(user.id),
            this.notificationDomain.getListUserSetting(user.id),
        ]);
        const tokens = ownerships.map(ownership => ownership.notificationToken);

        return this.notificationUtil.mapRecipient(user, kind, tokens, settings);
    }

    /** Counts one verification attempt, checks the code or backup code, and resets the counter on a match. */
    private async verifyTwoFactor(
        user: IUser,
        { method, code, backupCode }: IAuthTwoFactorVerify
    ): Promise<IAuthTwoFactorVerifyResult> {
        // Sequential by design: gate before the work it guards
        await this.authTwoFactorDomain.assertUnlocked(user);
        this.authTwoFactorDomain.assertMethodProvided(method);
        const twoFactor = this.userTwoFactorDomain.getEnabledTwoFactor(user);

        // Sequential by design: gate before the work it guards
        const attempt = await this.userTwoFactorDomain.incrementAttempt(
            user.id
        );
        await this.authTwoFactorDomain.assertAttemptAllowed(user, attempt);

        const verified = await this.authTwoFactorDomain.verifyTwoFactor(
            twoFactor,
            { method, code, backupCode }
        );
        this.authTwoFactorDomain.assertValid(verified.isValid);

        await this.userTwoFactorDomain.resetAttempt(user.id);

        return verified;
    }

    /** Counts one verification attempt and checks a code from a newly set-up authenticator against the pending secret. */
    private async verifySetupCode(
        user: IUser,
        pendingSecret: string,
        code: string
    ): Promise<void> {
        // Sequential by design: gate before the work it guards
        await this.authTwoFactorDomain.assertUnlocked(user);
        // Sequential by design: gate before the work it guards
        const attempt = await this.userTwoFactorDomain.incrementAttempt(
            user.id
        );
        await this.authTwoFactorDomain.assertAttemptAllowed(user, attempt);

        const isValid = this.authTwoFactorDomain.verifySetupCode(
            pendingSecret,
            user.id,
            code
        );
        this.authTwoFactorDomain.assertValid(isValid);

        await this.userTwoFactorDomain.resetAttempt(user.id);
    }

    getTwoFactorStatus(
        user: IUser
    ): IResponseReturn<UserTwoFactorStatusResponseDto> {
        const twoFactor = this.userUtil.mapTwoFactor(user.twoFactor);

        return { data: twoFactor };
    }

    async setupTwoFactor(
        user: IUser,
        { backupCode }: UserTwoFactorSetupRequestDto
    ): Promise<IResponseReturn<IUserTwoFactorSetup>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        const backupCodeForSetup =
            this.userTwoFactorDomain.getBackupCodeForSetup(
                user,
                backupCode ?? null
            );
        let backupCodeVerified: IAuthTwoFactorVerifyResult | null = null;
        if (backupCodeForSetup !== null) {
            // Sequential by design: gate before the work it guards
            backupCodeVerified = await this.verifyTwoFactor(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                code: null,
                backupCode: backupCodeForSetup,
            });
        }

        const { encryptedSecret, otpauthUrl, secret } =
            await this.authTwoFactorDomain.setupTwoFactor(user.id, user.email);
        if (backupCodeVerified) {
            await this.userTwoFactorDomain.saveSetupConsumingBackupCode(
                user,
                encryptedSecret,
                backupCodeVerified
            );
        } else {
            await this.userTwoFactorDomain.saveSetup(user.id, encryptedSecret);
        }

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: { secret, otpauthUrl } };
    }

    async enableTwoFactor(
        user: IUser,
        { code }: UserTwoFactorEnableRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        const pendingSecret = this.userTwoFactorDomain.getPendingSecret(user);
        // Sequential by design: gate before the work it guards
        await this.verifySetupCode(user, pendingSecret, code);

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userEnableTwoFactor,
            }),
        ];
        const backupCodes = await this.userTwoFactorDomain.enableTwoFactor(
            user.id,
            pendingSecret
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: { backupCodes } };
    }

    async disableTwoFactor(
        user: IUser,
        { code, backupCode, method }: UserTwoFactorDisableRequestDto
    ): Promise<IResponseReturn<void>> {
        this.userTwoFactorDomain.assertEnabled(user);
        // Sequential by design: gate before the work it guards
        await this.verifyTwoFactor(user, {
            code: code ?? null,
            backupCode: backupCode ?? null,
            method,
        });

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userDisableTwoFactor,
            }),
        ];
        const now = this.helperDateService.create();
        // Sequential by design: write must not run if an earlier step throws
        const revoked = await this.databaseService.withTransaction(async tx => {
            await this.userTwoFactorDomain.disableInTx(tx, user.id);

            return this.sessionDomain.revokeActiveByUserInTx(
                tx,
                user.id,
                user.id,
                now
            );
        });

        await this.sessionQueue.purgeLogins(user.id, revoked);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async regenerateTwoFactorBackupCodes(
        user: IUser,
        { code }: UserTwoFactorRegenerateBackupCodeRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        this.userTwoFactorDomain.assertEnabled(user);
        // Sequential by design: gate before the work it guards
        await this.verifyTwoFactor(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
            backupCode: null,
        });

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
            }),
        ];
        const backupCodes =
            await this.userTwoFactorDomain.regenerateTwoFactorBackupCodes(
                user.id
            );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: { backupCodes } };
    }

    async resetTwoFactorByAdmin(
        userId: string,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        this.userDomain.assertNotSelf(userId, user.id);

        // Sequential by design: gate before the work it guards
        const target = await this.userDomain.getOneWithRole(userId);
        this.roleDomain.assertActorOutranks(user.role.type, target.role.type);
        this.userDomain.assertUnblocked(target);

        this.userTwoFactorDomain.assertEnabled(target);

        const actorMetadata = this.userUtil.mapActivityLogActorMetadata(target);
        const targetMetadata = this.userUtil.mapActivityLogTargetMetadata(
            target,
            user.id
        );
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminUserResetTwoFactor,
                metadata: actorMetadata,
            }),
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userResetTwoFactorByAdmin,
                userId,
                createdBy: user.id,
                metadata: targetMetadata,
            }),
        ];

        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.getRecipient(
            target,
            EnumNotificationKind.resetTwoFactorByAdmin
        );
        const now = this.helperDateService.create();
        const revoked = await this.databaseService.withTransaction(async tx => {
            await this.userTwoFactorDomain.resetByAdminInTx(tx, userId);

            return this.sessionDomain.revokeActiveByUserInTx(
                tx,
                userId,
                user.id,
                now
            );
        });
        await Promise.all([
            this.authTwoFactorDomain.clearLock(target),
            this.sessionQueue.purgeLogins(userId, revoked),
            this.notificationQueue.sendResetTwoFactorByAdmin(
                recipient,
                user.id
            ),
        ]);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }
}

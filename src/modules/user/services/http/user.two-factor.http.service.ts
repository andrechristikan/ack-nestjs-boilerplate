import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
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
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserQueue } from '@modules/user/queues/user.queue';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorHttpService {
    constructor(
        private readonly userTwoFactorDomain: UserTwoFactorDomain,
        private readonly userDomain: UserDomain,
        private readonly userPasswordDomain: UserPasswordDomain,
        private readonly roleDomain: RoleDomain,
        private readonly sessionDomain: SessionDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly notificationDomain: NotificationDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly sessionQueue: SessionQueue,
        private readonly userQueue: UserQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationUtil: NotificationUtil,
        private readonly userUtil: UserUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private async getRecipient(
        user: IUserRecipient,
        kind: EnumNotificationKind
    ): Promise<INotificationRecipient> {
        const [tokens, settings] = await Promise.all([
            this.deviceDomain.getNotificationTokens(user.id),
            this.notificationDomain.getListUserSetting(user.id),
        ]);

        return this.notificationUtil.mapRecipient(user, kind, tokens, settings);
    }

    private async assertTwoFactorAttemptCounted(user: IUser): Promise<void> {
        const isAttemptCounted =
            await this.userTwoFactorDomain.countAttempt(user);
        if (!isAttemptCounted) {
            const lockoutLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId: user.id,
                    createdBy: user.id,
                }),
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];
            await this.userQueue.lockout(user.id);

            this.activityLogDomain.stagePrepared(lockoutLogs);
        }

        this.userTwoFactorDomain.assertAttemptCounted(isAttemptCounted);
    }

    private async assertPasswordMatched(
        user: IUser,
        password: string
    ): Promise<void> {
        const hasPassword = this.userUtil.hasPassword(user);
        if (!hasPassword) {
            return;
        }

        const isAttemptCounted =
            await this.userPasswordDomain.incrementPasswordAttempt(user.id);
        if (!isAttemptCounted) {
            const lockoutLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId: user.id,
                    createdBy: user.id,
                }),
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];
            await this.userQueue.lockout(user.id);

            this.activityLogDomain.stagePrepared(lockoutLogs);
        }

        this.userPasswordDomain.assertAttemptCounted(isAttemptCounted);
        // Sequential by design: the attempt resets only after the password matches
        await this.userPasswordDomain.assertOldPasswordMatch(user, password);
        await this.userPasswordDomain.resetPasswordAttempt(user.id);
    }

    getTwoFactorStatus(
        user: IUser
    ): IResponseReturn<UserTwoFactorStatusResponseDto> {
        const twoFactor = this.userUtil.mapTwoFactor(user.twoFactor);

        return { data: twoFactor };
    }

    async setupTwoFactor(
        user: IUser,
        { backupCode, password }: UserTwoFactorSetupRequestDto
    ): Promise<IResponseReturn<IUserTwoFactorSetup>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        // Sequential by design: gate before the work it guards
        await this.assertPasswordMatched(user, password);
        const backupCodeForSetup =
            this.userTwoFactorDomain.getBackupCodeForSetup(
                user,
                backupCode ?? null
            );
        let backupCodeVerified: IUserTwoFactorVerifyResult | null = null;
        if (backupCodeForSetup !== null) {
            // Sequential by design: gate before the work it guards
            await this.assertTwoFactorAttemptCounted(user);
            // Sequential by design: the attempt is counted before the code is checked
            backupCodeVerified = await this.userTwoFactorDomain.verify(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                code: null,
                backupCode: backupCodeForSetup,
            });
        }

        const { encryptedSecret, otpauthUrl, secret } =
            await this.userTwoFactorDomain.setup(user);
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
        { code, password }: UserTwoFactorEnableRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        // Sequential by design: gate before the work it guards
        await this.assertPasswordMatched(user, password);
        const pendingSecret = this.userTwoFactorDomain.getPendingSecret(user);
        // Sequential by design: gate before the work it guards
        await this.assertTwoFactorAttemptCounted(user);
        // Sequential by design: the attempt is counted before the code is checked
        await this.userTwoFactorDomain.verifySetupCode(
            user,
            pendingSecret,
            code
        );

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
        await this.assertTwoFactorAttemptCounted(user);
        // Sequential by design: the attempt is counted before the code is checked
        await this.userTwoFactorDomain.verify(user, {
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
        let revoked: ISessionRef[];
        try {
            // Sequential by design: write must not run if an earlier step throws
            revoked = await this.databaseService.withTransaction(async tx => {
                await this.userTwoFactorDomain.disableInTx(tx, user.id);

                return this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    user.id,
                    user.id,
                    now
                );
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new AuthTwoFactorNotEnabledException();
            }

            throw new AppUnknownException(err);
        }

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
        await this.assertTwoFactorAttemptCounted(user);
        // Sequential by design: the attempt is counted before the code is checked
        await this.userTwoFactorDomain.verify(user, {
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

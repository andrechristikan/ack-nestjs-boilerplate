import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { AccountDomain } from '@modules/account/domains/account.domain';
import { AccountTwoFactorDomain } from '@modules/account/domains/account.two-factor.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import type { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import type {
    IUser,
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
        private readonly accountTwoFactorDomain: AccountTwoFactorDomain,
        private readonly accountDomain: AccountDomain,
        private readonly authTwoFactorDomain: AuthTwoFactorDomain,
        private readonly roleDomain: RoleDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly sessionQueue: SessionQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly userUtil: UserUtil
    ) {}

    async loginVerifyTwoFactor({
        challengeToken,
        code,
        backupCode,
        method,
    }: UserLoginVerifyTwoFactorRequestDto): Promise<
        IResponseReturn<IAuthToken>
    > {
        const login = await this.accountTwoFactorDomain.verifyLogin(
            challengeToken,
            {
                code: code ?? null,
                backupCode: backupCode ?? null,
                method,
            }
        );
        const { user, challenge } = login;
        const verifyLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        await this.accountTwoFactorDomain.recordLoginVerification(login);

        this.activityLogDomain.stagePrepared(verifyLogs);

        const loginAction = this.userUtil.resolveLoginActivityLogAction(
            challenge.loginWith
        );
        const loginLogs = [
            this.activityLogDomain.prepare({
                action: loginAction,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        const tokens = await this.accountTwoFactorDomain.issueLoginTokens(
            login,
            challengeToken
        );

        this.activityLogDomain.stagePrepared(loginLogs);

        return { data: tokens };
    }

    async loginSetupTwoFactor({
        code,
        challengeToken,
    }: UserLoginSetupTwoFactorRequestDto): Promise<
        IResponseReturn<UserTwoFactorEnableResponseDto>
    > {
        const { user, pendingSecret } =
            await this.accountTwoFactorDomain.verifyLoginSetup(
                challengeToken,
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
        const setup = await this.accountTwoFactorDomain.setup(
            user,
            backupCode ?? null
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: setup };
    }

    async enableTwoFactor(
        user: IUser,
        { code }: UserTwoFactorEnableRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        const pendingSecret = this.userTwoFactorDomain.getPendingSecret(user);
        // Sequential by design: gate before the work it guards
        await this.accountTwoFactorDomain.verifySetupCode(
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
        await this.accountTwoFactorDomain.verify(user, {
            code: code ?? null,
            backupCode: backupCode ?? null,
            method,
        });

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userDisableTwoFactor,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        const revoked = await this.accountTwoFactorDomain.disable(user.id);

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
        await this.accountTwoFactorDomain.verify(user, {
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
        const recipient =
            await this.accountDomain.getNotificationRecipientOfUser(
                target,
                EnumNotificationKind.resetTwoFactorByAdmin
            );
        const revoked = await this.accountTwoFactorDomain.resetByAdmin(
            userId,
            user.id
        );
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

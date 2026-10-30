import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { AccountDomain } from '@modules/account/domains/account.domain';
import { AccountPasswordDomain } from '@modules/account/domains/account.password.domain';
import { AccountTwoFactorDomain } from '@modules/account/domains/account.two-factor.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserPasswordHttpService {
    constructor(
        private readonly userDomain: UserDomain,
        private readonly userPasswordDomain: UserPasswordDomain,
        private readonly accountPasswordDomain: AccountPasswordDomain,
        private readonly accountDomain: AccountDomain,
        private readonly accountTwoFactorDomain: AccountTwoFactorDomain,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly roleDomain: RoleDomain,
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly sessionQueue: SessionQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly userUtil: UserUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async updatePasswordByAdmin(
        userId: string,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        this.userDomain.assertNotSelf(userId, user.id);

        // Sequential by design: gate before the work it guards
        const target = await this.userDomain.getOneWithRole(userId);
        this.roleDomain.assertActorOutranks(user.role.type, target.role.type);
        this.userDomain.assertUnblocked(target);

        const { password, passwordString } =
            await this.userPasswordDomain.createTemporaryPassword();

        // Sequential by design: write must not run if an earlier step throws
        const recipient =
            await this.accountDomain.getNotificationRecipientOfUser(
                target,
                EnumNotificationKind.temporaryPasswordByAdmin
            );
        const {
            user: row,
            passwordHistoryId,
            revoked,
        } = await this.accountPasswordDomain.updateByAdmin(
            userId,
            password,
            user.id
        );

        const actorMetadata = this.userUtil.mapActivityLogActorMetadata(row);
        const targetMetadata = this.userUtil.mapActivityLogTargetMetadata(
            row,
            user.id
        );
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminUserUpdatePassword,
                metadata: actorMetadata,
            }),
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userUpdatePasswordByAdmin,
                userId,
                createdBy: user.id,
                metadata: targetMetadata,
            }),
        ];
        const passwordCreatedAt = this.helperDateService.formatToIso(
            password.passwordCreated
        );
        const passwordExpiredAt = this.helperDateService.formatToIso(
            password.passwordExpired
        );
        await Promise.all([
            this.sessionQueue.purgeLogins(userId, revoked),
            this.notificationQueue.sendTemporaryPasswordByAdmin(
                recipient,
                {
                    password: passwordString,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
                user.id,
                passwordHistoryId
            ),
        ]);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async changePassword(
        user: IUser,
        {
            newPassword,
            oldPassword,
            backupCode,
            code,
            method,
        }: UserChangePasswordRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.accountPasswordDomain.verifyChange(
            user,
            oldPassword,
            newPassword
        );

        // Sequential by design: gate before the work it guards
        const twoFactorVerified =
            await this.accountTwoFactorDomain.verifyIfEnabled(user, {
                code: code ?? null,
                backupCode: backupCode ?? null,
                method: method ?? null,
            });
        const password =
            await this.authPasswordUtil.createPassword(newPassword);
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userChangePassword,
            }),
        ];
        if (twoFactorVerified) {
            const verifyTwoFactorActivityLog = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: user.id,
                createdBy: user.id,
            });
            activityLogs.push(verifyTwoFactorActivityLog);
        }

        // Sequential by design: write must not run if an earlier step throws
        const recipient =
            await this.accountDomain.getNotificationRecipientOfUser(
                user,
                EnumNotificationKind.changePassword
            );
        const { passwordHistoryId, revoked } =
            await this.accountPasswordDomain.change(
                user,
                password,
                twoFactorVerified
            );
        await Promise.all([
            this.sessionQueue.purgeLogins(user.id, revoked),
            this.notificationQueue.sendChangePassword(
                recipient,
                passwordHistoryId
            ),
        ]);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async forgotPassword({
        email,
    }: UserForgotPasswordRequestDto): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            'changePassword',
            'forgotAllowed'
        );

        const { user, forgot } =
            await this.userPasswordDomain.prepareForgotPassword(email);
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userForgotPassword,
                userId: user.id,
                createdBy: user.id,
            }),
        ];

        // Sequential by design: write must not run if an earlier step throws
        const recipient =
            await this.accountDomain.getNotificationRecipientOfUser(
                user,
                EnumNotificationKind.forgotPassword
            );
        await this.userPasswordDomain.createForgotPassword(
            user.id,
            email,
            forgot
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        const expiredAt = this.helperDateService.formatToIso(forgot.expiredAt);
        await this.notificationQueue.sendForgotPassword(recipient, {
            expiredAt,
            link: forgot.link,
            reference: forgot.reference,
            expiredInMinutes: forgot.expiredInMinutes,
            resendInMinutes: forgot.resendInMinutes,
        });

        return {};
    }

    async resetPassword({
        newPassword,
        token,
        backupCode,
        code,
        method,
    }: UserForgotPasswordResetRequestDto): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            'changePassword',
            'forgotAllowed'
        );

        const reset = await this.userPasswordDomain.getOneActiveReset(token);
        // Sequential by design: gate before the work it guards
        await this.accountPasswordDomain.assertNew(reset.userId, newPassword);

        // Sequential by design: gate before the work it guards
        const twoFactorVerified =
            await this.accountTwoFactorDomain.verifyIfEnabled(reset.user, {
                code: code ?? null,
                backupCode: backupCode ?? null,
                method: method ?? null,
            });
        const password =
            await this.authPasswordUtil.createPassword(newPassword);
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userResetPassword,
                userId: reset.userId,
                createdBy: reset.userId,
            }),
        ];
        if (twoFactorVerified) {
            const verifyTwoFactorActivityLog = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: reset.userId,
                createdBy: reset.userId,
            });
            activityLogs.push(verifyTwoFactorActivityLog);
        }

        // Sequential by design: write must not run if an earlier step throws
        const recipient =
            await this.accountDomain.getNotificationRecipientOfUser(
                reset.user,
                EnumNotificationKind.resetPassword
            );
        const revoked = await this.accountPasswordDomain.reset(
            reset,
            password,
            twoFactorVerified
        );
        await Promise.all([
            this.sessionQueue.purgeLogins(reset.userId, revoked),
            this.notificationQueue.sendResetPassword(recipient, reset.id),
        ]);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }
}

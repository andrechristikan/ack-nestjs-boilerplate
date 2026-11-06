import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import type {
    IUser,
    IUserTwoFactorVerifyInput,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserPasswordHttpService {
    constructor(
        private readonly userDomain: UserDomain,
        private readonly userPasswordDomain: UserPasswordDomain,
        private readonly userAuthDomain: UserAuthDomain,
        private readonly userTwoFactorDomain: UserTwoFactorDomain,
        private readonly passwordHistoryDomain: PasswordHistoryDomain,
        private readonly sessionDomain: SessionDomain,
        private readonly notificationDomain: NotificationDomain,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly roleDomain: RoleDomain,
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly sessionQueue: SessionQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly userUtil: UserUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private async verifyTwoFactorIfRequired(
        user: IUser,
        input: IUserTwoFactorVerifyInput
    ): Promise<IUserTwoFactorVerifyResult | null> {
        const requiresTwoFactorVerification =
            this.userUtil.requiresTwoFactorVerification(user);
        if (!requiresTwoFactorVerification) {
            return null;
        }

        const method = this.userTwoFactorDomain.getProvidedMethod(input.method);

        const attempt = await this.userTwoFactorDomain.countAttempt(user);
        const lockoutLogs = attempt.lockoutStages.map(stage =>
            this.activityLogDomain.prepare(stage)
        );
        this.activityLogDomain.stagePrepared(lockoutLogs);

        this.userTwoFactorDomain.assertAttemptCounted(attempt.isAttemptCounted);

        return this.userTwoFactorDomain.verify(user, { ...input, method });
    }

    async updatePasswordByAdmin(
        userId: string,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        this.userDomain.assertNotSelf(userId, user.id);

        // Sequential by design: gate before the work it guards
        const target = await this.userDomain.getOneWithRole(userId);
        this.roleDomain.assertActorOutranks(user.role.type, target.role.type);
        this.userDomain.assertUnblocked(target);

        const [{ password, passwordString }, recipient] = await Promise.all([
            this.userPasswordDomain.createTemporaryPassword(),
            this.notificationDomain.getRecipient(
                target,
                EnumNotificationKind.temporaryPasswordByAdmin
            ),
        ]);

        // Sequential by design: write must not run if an earlier step throws
        const { row, passwordHistoryId, revoked } =
            await this.databaseService.withTransaction(async tx => {
                const row = await this.userDomain.updatePasswordInTx(
                    tx,
                    userId,
                    password,
                    user.id
                );
                const passwordHistory =
                    await this.passwordHistoryDomain.createInTx(
                        tx,
                        userId,
                        password.passwordHash,
                        EnumPasswordHistoryType.admin,
                        password.passwordPeriodExpired,
                        password.passwordCreated,
                        user.id
                    );
                await this.userPasswordDomain.markUnusedResetsUsedInTx(
                    tx,
                    userId
                );
                const revoked = await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    userId,
                    user.id,
                    password.passwordCreated
                );

                return { row, passwordHistoryId: passwordHistory.id, revoked };
            });

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
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userChangePassword,
            }),
        ];
        // Sequential by design: gate before the work it guards
        const attempt =
            await this.userPasswordDomain.countPasswordAttempt(user);
        if (attempt !== null) {
            const lockoutLogs = attempt.lockoutStages.map(stage =>
                this.activityLogDomain.prepare(stage)
            );
            this.activityLogDomain.stagePrepared(lockoutLogs);

            await this.userAuthDomain.assertPasswordAttempt(
                attempt,
                oldPassword ?? null
            );
            // Sequential by design: gate before the work it guards
            await this.passwordHistoryDomain.assertNew(user.id, newPassword);
        }

        // Sequential by design: gate before the work it guards
        const twoFactorVerified = await this.verifyTwoFactorIfRequired(user, {
            code: code ?? null,
            backupCode: backupCode ?? null,
            method: method ?? null,
        });
        const [password, recipient] = await Promise.all([
            this.authPasswordUtil.createPassword(newPassword),
            this.notificationDomain.getRecipient(
                user,
                EnumNotificationKind.changePassword
            ),
        ]);
        if (twoFactorVerified) {
            const verifyTwoFactorActivityLog = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: user.id,
                createdBy: user.id,
            });
            activityLogs.push(verifyTwoFactorActivityLog);
        }

        // Sequential by design: write must not run if an earlier step throws
        const { passwordHistoryId, revoked } =
            await this.databaseService.withTransaction(async tx => {
                await this.userDomain.updatePasswordInTx(
                    tx,
                    user.id,
                    password,
                    user.id
                );
                const passwordHistory =
                    await this.passwordHistoryDomain.createInTx(
                        tx,
                        user.id,
                        password.passwordHash,
                        EnumPasswordHistoryType.profile,
                        password.passwordPeriodExpired,
                        password.passwordCreated,
                        user.id
                    );
                await this.userPasswordDomain.markUnusedResetsUsedInTx(
                    tx,
                    user.id
                );
                const revoked = await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    user.id,
                    user.id,
                    password.passwordCreated
                );
                if (twoFactorVerified) {
                    await this.userTwoFactorDomain.recordVerificationInTx(
                        tx,
                        user,
                        twoFactorVerified
                    );
                }

                return { passwordHistoryId: passwordHistory.id, revoked };
            });
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
            EnumFeatureFlagKey.changePassword,
            EnumFeatureFlagMetadataKey.forgotAllowed
        );

        const prepared =
            await this.userPasswordDomain.prepareForgotPassword(email);
        if (prepared === null) {
            return {};
        }

        const { user, forgot } = prepared;
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userForgotPassword,
                userId: user.id,
                createdBy: user.id,
            }),
        ];

        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.notificationDomain.getRecipient(
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
            EnumFeatureFlagKey.changePassword,
            EnumFeatureFlagMetadataKey.forgotAllowed
        );

        const reset = await this.userPasswordDomain.getOneActiveReset(token);
        // Sequential by design: gate before the work it guards
        await this.passwordHistoryDomain.assertNew(reset.userId, newPassword);

        // Sequential by design: gate before the work it guards
        const twoFactorVerified = await this.verifyTwoFactorIfRequired(
            reset.user,
            {
                code: code ?? null,
                backupCode: backupCode ?? null,
                method: method ?? null,
            }
        );
        const [password, recipient] = await Promise.all([
            this.authPasswordUtil.createPassword(newPassword),
            this.notificationDomain.getRecipient(
                reset.user,
                EnumNotificationKind.resetPassword
            ),
        ]);
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
        let revoked: ISessionRef[];
        try {
            revoked = await this.databaseService.withTransaction(async tx => {
                await this.userDomain.updatePasswordInTx(
                    tx,
                    reset.userId,
                    password,
                    reset.userId
                );
                await this.passwordHistoryDomain.createInTx(
                    tx,
                    reset.userId,
                    password.passwordHash,
                    EnumPasswordHistoryType.forgot,
                    password.passwordPeriodExpired,
                    password.passwordCreated,
                    reset.userId
                );
                await this.userPasswordDomain.markResetUsedInTx(
                    tx,
                    reset.id,
                    password.passwordCreated
                );
                await this.userPasswordDomain.markUnusedResetsUsedInTx(
                    tx,
                    reset.userId
                );
                const sessions =
                    await this.sessionDomain.revokeActiveByUserInTx(
                        tx,
                        reset.userId,
                        reset.userId,
                        password.passwordCreated
                    );
                if (twoFactorVerified) {
                    await this.userTwoFactorDomain.recordVerificationInTx(
                        tx,
                        reset.user,
                        twoFactorVerified
                    );
                }

                return sessions;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new UserTokenInvalidException();
            }

            throw new AppUnknownException(err);
        }
        await Promise.all([
            this.sessionQueue.purgeLogins(reset.userId, revoked),
            this.notificationQueue.sendResetPassword(recipient, reset.id),
        ]);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }
}

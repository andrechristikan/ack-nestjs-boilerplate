import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import type {
    IUser,
    IUserTwoFactorVerifyInput,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserResetPasswordUseCase implements IAppUseCase<
    [UserForgotPasswordResetRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userService: UserService,
        private readonly userPasswordService: UserPasswordService,
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly sessionService: SessionService,
        private readonly notificationService: NotificationService,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly featureFlagService: FeatureFlagService,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly userUtil: UserUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
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

        const method = this.userTwoFactorService.getProvidedMethod(
            input.method
        );

        const attempt = await this.userTwoFactorService.countAttempt(user);
        const lockoutLogs = attempt.lockoutStages.map(stage =>
            this.activityLogService.prepare(stage)
        );
        this.activityLogService.stagePrepared(lockoutLogs);

        this.userTwoFactorService.assertAttemptCounted(
            attempt.isAttemptCounted
        );

        return this.userTwoFactorService.verify(user, { ...input, method });
    }

    async execute({
        newPassword,
        token,
        backupCode,
        code,
        method,
    }: UserForgotPasswordResetRequestDto): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.changePassword,
            EnumFeatureFlagMetadataKey.forgotAllowed
        );

        const reset = await this.userPasswordService.getOneActiveReset(token);
        // Sequential by design: gate before the work it guards
        await this.passwordHistoryService.assertNew(reset.userId, newPassword);

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
            this.notificationService.getRecipient(
                reset.user,
                EnumNotificationKind.resetPassword
            ),
        ]);
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userResetPassword,
                userId: reset.userId,
                createdBy: reset.userId,
            }),
        ];
        if (twoFactorVerified) {
            const verifyTwoFactorActivityLog = this.activityLogService.prepare({
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
                await this.userService.updatePasswordInTx(
                    tx,
                    reset.userId,
                    password,
                    reset.userId
                );
                await this.passwordHistoryService.createInTx(
                    tx,
                    reset.userId,
                    password.passwordHash,
                    EnumPasswordHistoryType.forgot,
                    password.passwordPeriodExpired,
                    password.passwordCreated,
                    reset.userId
                );
                await this.userPasswordService.markResetUsedInTx(
                    tx,
                    reset.id,
                    password.passwordCreated
                );
                await this.userPasswordService.markUnusedResetsUsedInTx(
                    tx,
                    reset.userId
                );
                const sessions =
                    await this.sessionService.revokeActiveByUserInTx(
                        tx,
                        reset.userId,
                        reset.userId,
                        password.passwordCreated
                    );
                if (twoFactorVerified) {
                    await this.userTwoFactorService.recordVerificationInTx(
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

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}

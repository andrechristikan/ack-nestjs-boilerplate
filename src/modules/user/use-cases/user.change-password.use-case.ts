import { DatabaseService } from '@common/database/services/database.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type {
    IUser,
    IUserTwoFactorVerifyInput,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserChangePasswordUseCase implements IAppUseCase<
    [IUser, UserChangePasswordRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userService: UserService,
        private readonly userPasswordService: UserPasswordService,
        private readonly userAuthService: UserAuthService,
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly sessionService: SessionService,
        private readonly notificationService: NotificationService,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly userUtil: UserUtil,
        private readonly databaseService: DatabaseService
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

    async execute(
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
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userChangePassword,
            }),
        ];
        // Sequential by design: gate before the work it guards
        const attempt =
            await this.userPasswordService.countPasswordAttempt(user);
        if (attempt !== null) {
            const lockoutLogs = attempt.lockoutStages.map(stage =>
                this.activityLogService.prepare(stage)
            );
            this.activityLogService.stagePrepared(lockoutLogs);

            await this.userAuthService.assertPasswordAttempt(
                attempt,
                oldPassword ?? null
            );
            // Sequential by design: gate before the work it guards
            await this.passwordHistoryService.assertNew(user.id, newPassword);
        }

        // Sequential by design: gate before the work it guards
        const twoFactorVerified = await this.verifyTwoFactorIfRequired(user, {
            code: code ?? null,
            backupCode: backupCode ?? null,
            method: method ?? null,
        });
        const [password, recipient] = await Promise.all([
            this.authPasswordUtil.createPassword(newPassword),
            this.notificationService.getRecipient(
                user,
                EnumNotificationKind.changePassword
            ),
        ]);
        if (twoFactorVerified) {
            const verifyTwoFactorActivityLog = this.activityLogService.prepare({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: user.id,
                createdBy: user.id,
            });
            activityLogs.push(verifyTwoFactorActivityLog);
        }

        // Sequential by design: write must not run if an earlier step throws
        const { passwordHistoryId, revoked } =
            await this.databaseService.withTransaction(async tx => {
                await this.userService.updatePasswordInTx(
                    tx,
                    user.id,
                    password,
                    user.id
                );
                const passwordHistory =
                    await this.passwordHistoryService.createInTx(
                        tx,
                        user.id,
                        password.passwordHash,
                        EnumPasswordHistoryType.profile,
                        password.passwordPeriodExpired,
                        password.passwordCreated,
                        user.id
                    );
                await this.userPasswordService.markUnusedResetsUsedInTx(
                    tx,
                    user.id
                );
                const revoked =
                    await this.sessionService.revokeActiveByUserInTx(
                        tx,
                        user.id,
                        user.id,
                        password.passwordCreated
                    );
                if (twoFactorVerified) {
                    await this.userTwoFactorService.recordVerificationInTx(
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

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}

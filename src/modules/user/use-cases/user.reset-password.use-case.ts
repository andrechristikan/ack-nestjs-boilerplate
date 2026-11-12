import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContextPublic } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserResetPasswordUseCase implements IAppUseCase<
    [IRequestContextPublic, UserForgotPasswordResetRequestDto],
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
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        context: IRequestContextPublic,
        {
            newPassword,
            token,
            backupCode,
            code,
            method,
        }: UserForgotPasswordResetRequestDto
    ): Promise<IResponseReturn<void>> {
        const reset = await this.userPasswordService.getOneActiveReset(token);
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        await this.passwordHistoryService.assertNew(reset.userId, newPassword);

        const twoFactorVerified =
            await this.userTwoFactorService.verifyIfRequired(
                context.snapshot,
                reset.user,
                {
                    code: code ?? null,
                    backupCode: backupCode ?? null,
                    method: method ?? null,
                }
            );
        const password =
            await this.authPasswordUtil.createPassword(newPassword);

        try {
            await this.outboxService.withTransaction(async tx => {
                const [snapshot] = await Promise.all([
                    this.notificationService.getSnapshot(reset.user),
                    this.userService.updatePasswordInTx(
                        tx,
                        reset.userId,
                        password,
                        reset.userId
                    ),
                ]);
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
                await this.sessionService.revokeActiveByUserInTx(
                    tx,
                    reset.userId,
                    reset.userId,
                    password.passwordCreated
                );
                const entries = [
                    this.activityLogService.recordEffect(context.snapshot, {
                        action: EnumActivityLogAction.userResetPassword,
                        userId: reset.userId,
                        createdBy: reset.userId,
                    }),
                ];
                if (twoFactorVerified) {
                    await this.userTwoFactorService.recordVerificationInTx(
                        tx,
                        reset.user,
                        twoFactorVerified
                    );
                    const verifyEntry = this.activityLogService.recordEffect(
                        context.snapshot,
                        {
                            action: EnumActivityLogAction.userVerifyTwoFactor,
                            userId: reset.userId,
                            createdBy: reset.userId,
                        }
                    );
                    entries.push(verifyEntry);
                }
                const effect = this.notificationService.notify(
                    EnumNotificationKind.resetPassword,
                    {
                        userId: reset.userId,
                        proceedBy: reset.userId,
                        snapshot,
                    }
                );
                await this.outboxService.addManyInTx(tx, [...entries, effect]);
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

        return {};
    }
}

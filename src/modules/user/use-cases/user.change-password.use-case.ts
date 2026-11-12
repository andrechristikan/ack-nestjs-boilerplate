import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
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
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserChangePasswordUseCase implements IAppUseCase<
    [IUser, UserChangePasswordRequestDto, IRequestContext],
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
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        user: IUser,
        {
            newPassword,
            oldPassword,
            backupCode,
            code,
            method,
        }: UserChangePasswordRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        const attempt = await this.userPasswordService.countPasswordAttempt(
            user,
            context
        );
        if (attempt !== null) {
            await this.userAuthService.assertPasswordAttempt(
                attempt,
                oldPassword ?? null
            );
            await this.passwordHistoryService.assertNew(user.id, newPassword);
        }

        const twoFactorVerified =
            await this.userTwoFactorService.verifyIfRequired(
                user,
                {
                    code: code ?? null,
                    backupCode: backupCode ?? null,
                    method: method ?? null,
                },
                context
            );
        const password =
            await this.authPasswordUtil.createPassword(newPassword);

        await this.outboxService.withTransaction(async tx => {
            await this.userService.updatePasswordInTx(
                tx,
                user.id,
                password,
                user.id
            );
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
            await this.sessionService.revokeActiveByUserInTx(
                tx,
                user.id,
                user.id,
                password.passwordCreated
            );
            const entries = [
                this.activityLogService.recordEffect(
                    { action: EnumActivityLogAction.userChangePassword },
                    context
                ),
            ];
            if (twoFactorVerified) {
                await this.userTwoFactorService.recordVerificationInTx(
                    tx,
                    user,
                    twoFactorVerified
                );
                const verifyEntry = this.activityLogService.recordEffect(
                    {
                        action: EnumActivityLogAction.userVerifyTwoFactor,
                        userId: user.id,
                        createdBy: user.id,
                    },
                    context
                );
                entries.push(verifyEntry);
            }
            const effect = this.notificationService.notify(
                EnumNotificationKind.changePassword,
                { userId: user.id, proceedBy: user.id }
            );
            await this.outboxService.addManyInTx(tx, [...entries, effect]);
        });

        return {};
    }
}

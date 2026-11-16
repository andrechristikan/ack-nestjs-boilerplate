import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class UserChangePasswordUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        UserChangePasswordRequestDto,
    ],
    IResponseReturn<void>
> {
    private readonly appName: string;

    constructor(
        private readonly userService: UserService,
        private readonly userPasswordService: UserPasswordService,
        private readonly userAuthService: UserAuthService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly sessionService: SessionService,
        private readonly notificationService: NotificationService,
        private readonly authPasswordService: AuthPasswordService,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        this.appName = this.configService.get<string>('app.name')!;
    }

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        {
            newPassword,
            password: currentPassword,
            backupCode,
            code,
            method,
            otp,
        }: UserChangePasswordRequestDto
    ): Promise<IResponseReturn<void>> {
        const { user } = userContext;
        // Sequential by design: gate before the work it guards
        const check = await this.userAuthService.assertReauthentication(
            requestContext,
            apiKeyContext,
            user,
            {
                action: EnumUserReauthenticationAction.changePassword,
                password: currentPassword ?? null,
                method: method ?? null,
                code: code ?? null,
                backupCode: backupCode ?? null,
                otp: otp ?? null,
            }
        );
        if (check.isPasswordChecked) {
            await this.passwordHistoryService.assertNew(
                authContext.userId,
                newPassword
            );
        }

        const contextWords = this.authPasswordUtil.createContextWords(
            this.appName,
            user.email,
            user.username,
            user.name
        );
        await this.authPasswordService.assertAllowed(newPassword, contextWords);
        const password =
            await this.authPasswordUtil.createPassword(newPassword);

        try {
            await this.outboxService.withTransaction(async tx => {
                await this.userAuthService.completeReauthenticationInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    user,
                    check
                );
                await this.userService.updatePasswordInTx(
                    tx,
                    authContext.userId,
                    password,
                    authContext.userId
                );
                await this.passwordHistoryService.createInTx(
                    tx,
                    authContext.userId,
                    password.passwordHash,
                    EnumPasswordHistoryType.profile,
                    password.passwordPeriodExpired,
                    password.passwordCreated,
                    authContext.userId
                );
                await this.userPasswordService.markUnusedResetsUsedInTx(
                    tx,
                    authContext.userId,
                    authContext.userId
                );
                await this.sessionService.revokeActiveByUserExceptInTx(
                    tx,
                    authContext.userId,
                    authContext.sessionId,
                    authContext.userId,
                    password.passwordCreated
                );
                const entry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.userChangePassword,
                    }
                );
                const effect = this.notificationService.notify(
                    EnumNotificationKind.changePassword,
                    {
                        userId: authContext.userId,
                        proceedBy: authContext.userId,
                    }
                );
                await this.outboxService.addManyInTx(tx, [entry, effect]);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (
                check.twoFactor !== null &&
                mapped instanceof DatabaseWriteConflictException
            ) {
                throw new AuthTwoFactorInvalidException();
            }

            throw new AppUnknownException(err);
        }

        return {};
    }
}

import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
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
        private readonly userPasswordService: UserPasswordService,
        private readonly userAuthService: UserAuthService,
        private readonly mfaService: MfaService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly sessionService: SessionService,
        private readonly notificationQueue: NotificationQueue,
        private readonly authPasswordService: AuthPasswordService,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
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
            passkeyChallengeToken,
            passkeyResponse,
            otp,
        }: UserChangePasswordRequestDto
    ): Promise<IResponseReturn<void>> {
        const { user } = userContext;
        const state = await this.mfaService.getFactorState(user.id);
        // Sequential by design: a credential proof, awaited alone; a statement whose failure is the answer, awaited before an unrelated write
        const input = {
            action: EnumUserReauthenticationAction.changePassword,
            password: currentPassword ?? null,
            method: method ?? null,
            code: code ?? null,
            backupCode: backupCode ?? null,
            passkeyChallengeToken: passkeyChallengeToken ?? null,
            passkeyResponse: passkeyResponse ?? null,
            otp: otp ?? null,
        };
        const passwordCheck =
            await this.userAuthService.checkReauthenticationPassword(
                user,
                input
            );
        if (passwordCheck.limit !== null) {
            const limit = passwordCheck.limit;
            const isLocked = await this.databaseService.withTransaction(
                async tx =>
                    this.userAuthService.countFailedReauthenticationInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext,
                        limit
                    )
            );

            return this.userAuthService.throwFailedReauthentication(isLocked);
        }

        const mfaCheck = await this.mfaService.checkReauthentication(
            user.id,
            input,
            passwordCheck.isPasswordChecked,
            state
        );
        if (mfaCheck.failure !== null) {
            const failure = mfaCheck.failure;
            const isLocked = await this.databaseService.withTransaction(
                async tx =>
                    this.mfaService.countFailedAttemptInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext.userId,
                        failure
                    )
            );

            return this.mfaService.throwFailedAttempt(failure, isLocked);
        }

        const verificationId =
            await this.userAuthService.getReauthenticationVerificationId(
                user,
                input,
                passwordCheck.isPasswordChecked,
                mfaCheck.isEnabled
            );

        const contextWords = this.authPasswordUtil.createContextWords(
            this.appName,
            user.email,
            user.username,
            user.name
        );
        const checks = [
            this.authPasswordService.assertAllowed(newPassword, contextWords),
        ];
        if (passwordCheck.isPasswordChecked) {
            const historyCheck = this.passwordHistoryService.assertNew(
                authContext.userId,
                newPassword
            );
            checks.push(historyCheck);
        }
        await Promise.all(checks);
        const password = await this.authPasswordService.create(newPassword);

        await this.databaseService.withTransaction(async tx => {
            await this.userAuthService.completeReauthenticationInTx(
                tx,
                authContext,
                passwordCheck.isPasswordChecked,
                verificationId,
                true
            );
            await this.mfaService.completeReauthenticationInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                mfaCheck
            );
            await Promise.all([
                this.userPasswordService.replaceInTx(
                    tx,
                    authContext.userId,
                    password,
                    authContext.userId
                ),
                this.passwordHistoryService.createInTx(
                    tx,
                    authContext.userId,
                    password.passwordHash,
                    EnumPasswordHistoryType.profile,
                    password.passwordPeriodExpired,
                    password.passwordCreated,
                    authContext.userId
                ),
                this.sessionService.revokeActiveByUserExceptInTx(
                    tx,
                    authContext.userId,
                    authContext.sessionId,
                    authContext.userId,
                    password.passwordCreated
                ),
            ]);
            const entry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userPasswordChanged,
                }
            );
            const effect = this.notificationQueue.notify(
                EnumNotificationKind.changePassword,
                {
                    userId: authContext.userId,
                    proceedBy: authContext.userId,
                }
            );
            await this.outboxService.addManyInTx(tx, [entry, effect]);
        });

        return {};
    }
}

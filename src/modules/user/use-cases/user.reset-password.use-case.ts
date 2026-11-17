import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumMfaChallengePurpose,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import type { IMfaCheck } from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserResetPasswordUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserForgotPasswordResetRequestDto],
    IResponseReturn<void>
> {
    private readonly appName: string;

    constructor(
        private readonly userService: UserService,
        private readonly userPasswordService: UserPasswordService,
        private readonly mfaService: MfaService,
        private readonly mfaChallengeService: MfaChallengeService,
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
        {
            newPassword,
            token,
            backupCode,
            code,
            method,
            passkeyChallengeToken,
            passkeyResponse,
        }: UserForgotPasswordResetRequestDto
    ): Promise<IResponseReturn<void>> {
        const reset = await this.userPasswordService.getOneActiveReset(token);
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        await this.passwordHistoryService.assertNew(reset.userId, newPassword);

        const isMfaEnabled = await this.mfaService.isEnabled(reset.userId);
        let mfaCheck: IMfaCheck | null = null;
        let claimedChallengeToken: string | null = null;
        if (isMfaEnabled) {
            claimedChallengeToken =
                method === EnumMfaMethod.passkey
                    ? (passkeyChallengeToken ?? null)
                    : null;
            let webAuthnChallenge: string | null = null;
            if (claimedChallengeToken !== null) {
                webAuthnChallenge =
                    await this.mfaChallengeService.getWebAuthnChallengeForUser(
                        claimedChallengeToken,
                        EnumMfaChallengePurpose.resetPassword,
                        reset.userId
                    );
            }
            mfaCheck = await this.mfaService.check(
                requestContext,
                apiKeyContext,
                reset.userId,
                {
                    code: code ?? null,
                    backupCode: backupCode ?? null,
                    method: method ?? null,
                    passkeyResponse: passkeyResponse ?? null,
                },
                webAuthnChallenge
            );
        }
        const contextWords = this.authPasswordUtil.createContextWords(
            this.appName,
            reset.user.email,
            reset.user.username,
            reset.user.name
        );
        await this.authPasswordService.assertAllowed(newPassword, contextWords);
        const password =
            await this.authPasswordUtil.createPassword(newPassword);

        try {
            await this.outboxService.withTransaction(async tx => {
                if (claimedChallengeToken !== null) {
                    await this.mfaChallengeService.consumeInTx(
                        tx,
                        claimedChallengeToken,
                        EnumMfaChallengePurpose.resetPassword,
                        reset.userId
                    );
                }
                if (mfaCheck !== null) {
                    await this.mfaService.completeInTx(
                        tx,
                        reset.userId,
                        mfaCheck
                    );
                }
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
                    password.passwordCreated,
                    reset.userId
                );
                await this.userPasswordService.markUnusedResetsUsedInTx(
                    tx,
                    reset.userId,
                    reset.userId
                );
                await this.sessionService.revokeActiveByUserInTx(
                    tx,
                    reset.userId,
                    reset.userId,
                    password.passwordCreated
                );
                const entries = [
                    this.activityLogService.recordEffect(
                        requestContext,
                        apiKeyContext,
                        null,
                        null,
                        {
                            action: EnumActivityLogAction.userResetPassword,
                            userId: reset.userId,
                            createdBy: reset.userId,
                        }
                    ),
                ];
                if (mfaCheck !== null) {
                    const verifyEntry = this.activityLogService.recordEffect(
                        requestContext,
                        apiKeyContext,
                        null,
                        null,
                        {
                            action: EnumActivityLogAction.userVerifyMfa,
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

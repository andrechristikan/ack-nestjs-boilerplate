import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumMfaChallengePurpose,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import type { IMfaCheck } from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { DeviceService } from '@modules/device/services/device.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
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
        private readonly deviceService: DeviceService,
        private readonly notificationUtil: NotificationUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly authPasswordService: AuthPasswordService,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
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
        const contextWords = this.authPasswordUtil.createContextWords(
            this.appName,
            reset.user.email,
            reset.user.username,
            reset.user.name
        );
        // Sequential by design: a credential proof, awaited alone; a statement whose failure is the answer, awaited before an unrelated write
        const [isMfaEnabled] = await Promise.all([
            this.mfaService.isEnabled(reset.userId),
            this.passwordHistoryService.assertNew(reset.userId, newPassword),
            this.authPasswordService.assertAllowed(newPassword, contextWords),
        ]);
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
            const { check, failure } = await this.mfaService.check(
                reset.userId,
                {
                    code: code ?? null,
                    backupCode: backupCode ?? null,
                    method: method ?? null,
                    passkeyResponse: passkeyResponse ?? null,
                },
                webAuthnChallenge
            );
            if (failure !== null) {
                const isLocked = await this.databaseService.withTransaction(
                    async tx =>
                        this.mfaService.countFailedAttemptInTx(
                            tx,
                            requestContext,
                            apiKeyContext,
                            reset.userId,
                            failure
                        )
                );

                return this.mfaService.throwFailedAttempt(failure, isLocked);
            }
            mfaCheck = check;
        }
        const [password, tokens] = await Promise.all([
            this.authPasswordService.create(newPassword),
            this.deviceService.getNotificationTokens(reset.userId),
        ]);
        const snapshot = this.notificationUtil.sealSnapshot(reset.user, tokens);

        try {
            await this.databaseService.withTransaction(async tx => {
                if (claimedChallengeToken !== null && mfaCheck !== null) {
                    await this.mfaService.completeChallengeInTx(
                        tx,
                        reset.userId,
                        claimedChallengeToken,
                        EnumMfaChallengePurpose.resetPassword,
                        mfaCheck
                    );
                } else if (mfaCheck !== null) {
                    await this.mfaService.completeInTx(
                        tx,
                        reset.userId,
                        mfaCheck
                    );
                }
                await this.userPasswordService.markResetUsedInTx(
                    tx,
                    reset.id,
                    password.passwordCreated,
                    reset.userId
                );
                await Promise.all([
                    this.userService.updatePasswordInTx(
                        tx,
                        reset.userId,
                        password,
                        reset.userId
                    ),
                    this.passwordHistoryService.createInTx(
                        tx,
                        reset.userId,
                        password.passwordHash,
                        EnumPasswordHistoryType.forgot,
                        password.passwordPeriodExpired,
                        password.passwordCreated,
                        reset.userId
                    ),
                    this.userPasswordService.markUnusedResetsUsedInTx(
                        tx,
                        reset.userId,
                        reset.userId
                    ),
                    this.sessionService.revokeActiveByUserInTx(
                        tx,
                        reset.userId,
                        reset.userId,
                        password.passwordCreated
                    ),
                ]);
                const entries = [
                    this.activityLogQueue.recordEffect(
                        requestContext,
                        apiKeyContext,
                        null,
                        null,
                        {
                            action: EnumActivityLogAction.userPasswordReset,
                            userId: reset.userId,
                            createdBy: reset.userId,
                        }
                    ),
                ];
                if (mfaCheck !== null) {
                    const verifyEntry = this.activityLogQueue.recordEffect(
                        requestContext,
                        apiKeyContext,
                        null,
                        null,
                        {
                            action: EnumActivityLogAction.userMfaVerified,
                            userId: reset.userId,
                            createdBy: reset.userId,
                        }
                    );
                    entries.push(verifyEntry);
                }
                const effect = this.notificationQueue.notify(
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

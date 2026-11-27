import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
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
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
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
        const [state] = await Promise.all([
            this.mfaService.getFactorState(reset.userId),
            this.passwordHistoryService.assertNew(reset.userId, newPassword),
            this.authPasswordService.assertAllowed(newPassword, contextWords),
        ]);
        const isMfaEnabled = await this.mfaService.isEnabled(state);
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
                webAuthnChallenge,
                state
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
                await this.mfaService.completeInTx(tx, reset.userId, mfaCheck);
            }
            const consumed = await this.userPasswordService.markResetUsedInTx(
                tx,
                reset.id,
                password.passwordCreated,
                reset.userId
            );
            await Promise.all([
                this.userPasswordService.replaceInTx(
                    tx,
                    consumed.userId,
                    password,
                    consumed.userId
                ),
                this.passwordHistoryService.createInTx(
                    tx,
                    consumed.userId,
                    password.passwordHash,
                    EnumPasswordHistoryType.forgot,
                    password.passwordPeriodExpired,
                    password.passwordCreated,
                    consumed.userId
                ),
                this.sessionService.revokeActiveByUserInTx(
                    tx,
                    consumed.userId,
                    consumed.userId,
                    password.passwordCreated
                ),
            ]);
            const entries = [
                this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    null,
                    {
                        action: EnumActivityLogAction.userPasswordReset,
                        userId: consumed.userId,
                        createdBy: consumed.userId,
                    }
                ),
            ];
            if (mfaCheck !== null) {
                const verifyEntry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    null,
                    {
                        action: EnumActivityLogAction.userMfaVerified,
                        userId: consumed.userId,
                        createdBy: consumed.userId,
                    }
                );
                entries.push(verifyEntry);
            }
            const effect = this.notificationQueue.notify(
                EnumNotificationKind.resetPassword,
                {
                    userId: consumed.userId,
                    proceedBy: consumed.userId,
                    snapshot,
                }
            );
            await this.outboxService.addManyInTx(tx, [...entries, effect]);
        });

        return {};
    }
}

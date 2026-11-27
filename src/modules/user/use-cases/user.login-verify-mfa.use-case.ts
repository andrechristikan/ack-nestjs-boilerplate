import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumMfaChallengePurpose,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { UserLoginVerifyMfaRequestDto } from '@modules/user/dtos/request/user.login-verify-mfa.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserLoginVerifyMfaUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserLoginVerifyMfaRequestDto],
    IResponseReturn<IAuthToken>
> {
    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly mfaService: MfaService,
        private readonly mfaChallengeService: MfaChallengeService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly deviceService: DeviceService,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        {
            challengeToken,
            code,
            backupCode,
            method,
            passkeyResponse,
        }: UserLoginVerifyMfaRequestDto
    ): Promise<IResponseReturn<IAuthToken>> {
        const { userId, device, loginFrom, loginWith, webAuthnChallenge } =
            await this.mfaChallengeService.getLogin(challengeToken);

        const [user, state] = await Promise.all([
            this.userAuthService.getOneForMfaLogin(userId),
            this.mfaService.getFactorState(userId),
        ]);
        await this.mfaService.assertEnabled(state);
        const { check, failure } = await this.mfaService.check(
            user.id,
            {
                code: code ?? null,
                backupCode: backupCode ?? null,
                method,
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
                        user.id,
                        failure
                    )
            );

            return this.mfaService.throwFailedAttempt(failure, isLocked);
        }
        const loginAt = this.helperDateService.now();
        const { tokens } = await this.databaseService.withTransaction(
            async tx => {
                await this.mfaService.completeChallengeInTx(
                    tx,
                    user.id,
                    challengeToken,
                    EnumMfaChallengePurpose.login,
                    check
                );
                const entry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    null,
                    {
                        action: EnumActivityLogAction.userMfaVerified,
                        userId: user.id,
                        createdBy: user.id,
                    }
                );
                await this.outboxService.addInTx(tx, entry);
                const upserted = await this.deviceService.upsertForLoginInTx(
                    tx,
                    user.id,
                    device,
                    loginAt
                );

                return this.userAuthService.createTokenAndSessionInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    user,
                    upserted,
                    loginFrom,
                    loginWith,
                    loginAt,
                    false,
                    false
                );
            }
        );

        return { data: tokens };
    }
}

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { SessionRevokeRequestDto } from '@modules/session/dtos/request/session.revoke.request.dto';
import { SessionService } from '@modules/session/services/session.service';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class SessionRevokeUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        string,
        SessionRevokeRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly userAuthService: UserAuthService,
        private readonly mfaService: MfaService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        sessionId: string,
        {
            password,
            method,
            code,
            backupCode,
            passkeyChallengeToken,
            passkeyResponse,
            otp,
        }: SessionRevokeRequestDto
    ): Promise<IResponseReturn<void>> {
        const { user } = userContext;
        const userId = authContext.userId;
        const state = await this.mfaService.getFactorState(user.id);
        // Sequential by design: a credential proof, awaited alone
        const input = {
            action: EnumUserReauthenticationAction.sessionRevoke,
            password: password ?? null,
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

        const revokedAt = this.helperDateService.now();
        await this.databaseService.withTransaction(async tx => {
            await this.userAuthService.completeReauthenticationInTx(
                tx,
                authContext,
                passwordCheck.isPasswordChecked,
                verificationId,
                false
            );
            await this.mfaService.completeReauthenticationInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                mfaCheck
            );
            await this.sessionService.revokeInTx(
                tx,
                userId,
                sessionId,
                userId,
                revokedAt
            );

            const entry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.userSessionRevoked,
                }
            );
            await this.outboxService.addInTx(tx, entry);
        });

        return {};
    }
}

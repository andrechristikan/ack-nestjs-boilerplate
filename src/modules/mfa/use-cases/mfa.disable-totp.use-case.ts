import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { MfaNotEnabledException } from '@modules/mfa/exceptions/mfa.not-enabled.exception';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import { SessionService } from '@modules/session/services/session.service';
import type { MfaTotpDisableRequestDto } from '@modules/mfa/dtos/request/mfa.totp-disable.request.dto';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class MfaDisableTotpUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        MfaTotpDisableRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly mfaService: MfaService,
        private readonly mfaTotpService: MfaTotpService,
        private readonly userAuthService: UserAuthService,
        private readonly sessionService: SessionService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        {
            password,
            code,
            backupCode,
            method,
            passkeyChallengeToken,
            passkeyResponse,
            otp,
        }: MfaTotpDisableRequestDto
    ): Promise<IResponseReturn<void>> {
        const { user } = userContext;
        // Sequential by design: a credential proof, awaited alone
        await this.mfaTotpService.assertConfirmed(authContext.userId);
        const input = {
            action: EnumUserReauthenticationAction.mfaTotpDisable,
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
            passwordCheck.isPasswordChecked
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

        const now = this.helperDateService.now();
        try {
            await this.databaseService.withTransaction(async tx => {
                await this.userAuthService.completeReauthenticationInTx(
                    tx,
                    authContext,
                    passwordCheck.isPasswordChecked,
                    verificationId
                );
                await this.mfaService.completeReauthenticationInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    mfaCheck
                );
                await this.mfaTotpService.disableInTx(tx, authContext.userId);
                await this.mfaService.clearBackupCodesIfNoFactorInTx(
                    tx,
                    authContext.userId
                );
                await this.sessionService.revokeActiveByUserExceptInTx(
                    tx,
                    authContext.userId,
                    authContext.sessionId,
                    authContext.userId,
                    now
                );
                const entry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.userMfaTotpDisabled,
                    }
                );
                await this.outboxService.addInTx(tx, entry);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new MfaNotEnabledException();
            }

            throw new AppUnknownException(err);
        }

        return {};
    }
}

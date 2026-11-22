import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaTotpAlreadyEnabledException } from '@modules/mfa/exceptions/mfa.totp-already-enabled.exception';
import type { IMfaTotpSetup } from '@modules/mfa/interfaces/mfa.interface';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { MfaTotpSetupRequestDto } from '@modules/mfa/dtos/request/mfa.totp-setup.request.dto';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class MfaSetupTotpUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        MfaTotpSetupRequestDto,
    ],
    IResponseReturn<IMfaTotpSetup>
> {
    constructor(
        private readonly mfaService: MfaService,
        private readonly mfaTotpService: MfaTotpService,
        private readonly userAuthService: UserAuthService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        {
            method,
            code,
            backupCode,
            password,
            passkeyChallengeToken,
            passkeyResponse,
            otp,
        }: MfaTotpSetupRequestDto
    ): Promise<IResponseReturn<IMfaTotpSetup>> {
        const { user } = userContext;
        await Promise.all([
            this.mfaService.assertEnrolmentAllowed(EnumMfaMethod.totp),
            this.mfaTotpService.assertSetupAllowed(authContext.userId),
        ]);
        // Sequential by design: a credential proof, awaited alone
        const input = {
            action: EnumUserReauthenticationAction.mfaTotpSetup,
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

        try {
            const setup = await this.databaseService.withTransaction(
                async tx => {
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
                    const totpSetup = await this.mfaTotpService.setupInTx(
                        tx,
                        authContext.userId,
                        user.email
                    );
                    const entry = this.activityLogQueue.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.userMfaTotpSetUp,
                            userId: authContext.userId,
                            createdBy: authContext.userId,
                        }
                    );
                    await this.outboxService.addInTx(tx, entry);

                    return totpSetup;
                }
            );

            return { data: setup };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isUserCollision = this.databaseUtil.isUniqueCollision(
                err,
                'userId'
            );
            if (isUserCollision) {
                throw new MfaTotpAlreadyEnabledException();
            }

            const mapped = this.databaseUtil.toException(err);
            if (
                mfaCheck.check !== null &&
                mapped instanceof DatabaseWriteConflictException
            ) {
                throw new MfaInvalidException();
            }

            throw new AppUnknownException(err);
        }
    }
}

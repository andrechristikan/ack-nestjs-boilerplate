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
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaTotpSetupRequiredException } from '@modules/mfa/exceptions/mfa.totp-setup-required.exception';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { MfaTotpEnableRequestDto } from '@modules/mfa/dtos/request/mfa.totp-enable.request.dto';
import type { MfaBackupCodesResponseDto } from '@modules/mfa/dtos/response/mfa.backup-codes.response.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class MfaEnableTotpUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        MfaTotpEnableRequestDto,
    ],
    IResponseReturn<MfaBackupCodesResponseDto>
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
            code,
            password,
            backupCode,
            passkeyChallengeToken,
            passkeyResponse,
            otp,
        }: MfaTotpEnableRequestDto
    ): Promise<IResponseReturn<MfaBackupCodesResponseDto>> {
        const { user } = userContext;
        // Sequential by design: a credential proof, awaited alone
        await this.mfaService.assertEnrollmentAllowed(EnumMfaMethod.totp);
        const input = {
            action: EnumUserReauthenticationAction.mfaTotpEnable,
            password: password ?? null,
            method: backupCode === undefined ? null : EnumMfaMethod.backupCode,
            code: null,
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
        const {
            totpStep,
            pendingSecret,
            failure: setupFailure,
        } = await this.mfaService.checkTotpSetupCode(authContext.userId, code);
        if (setupFailure !== null) {
            const isSetupLocked = await this.databaseService.withTransaction(
                async tx =>
                    this.mfaService.countFailedAttemptInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext.userId,
                        setupFailure
                    )
            );

            return this.mfaService.throwFailedAttempt(
                setupFailure,
                isSetupLocked
            );
        }

        try {
            const backupCodes = await this.databaseService.withTransaction(
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
                    await this.mfaTotpService.enableInTx(
                        tx,
                        authContext.userId,
                        pendingSecret,
                        totpStep
                    );
                    await this.mfaService.resetAttemptInTx(
                        tx,
                        authContext.userId
                    );
                    const codes = await this.mfaService.createBackupCodesInTx(
                        tx,
                        authContext.userId
                    );
                    const entry = this.activityLogQueue.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.userMfaTotpEnabled,
                            userId: authContext.userId,
                            createdBy: authContext.userId,
                        }
                    );
                    await this.outboxService.addInTx(tx, entry);

                    return codes;
                }
            );

            return { data: { backupCodes } };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new MfaTotpSetupRequiredException();
            }

            throw new AppUnknownException(err);
        }
    }
}

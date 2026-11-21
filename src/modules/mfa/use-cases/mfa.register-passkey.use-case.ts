import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
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
    EnumMfaChallengePurpose,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { MfaPasskeyRegisterRequestDto } from '@modules/mfa/dtos/request/mfa.passkey-register.request.dto';
import type { MfaPasskeyRegisterResponseDto } from '@modules/mfa/dtos/response/mfa.passkey-register.response.dto';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaRegisterPasskeyUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        MfaPasskeyRegisterRequestDto,
    ],
    IResponseReturn<MfaPasskeyRegisterResponseDto>
> {
    constructor(
        private readonly mfaService: MfaService,
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly mfaChallengeService: MfaChallengeService,
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
        { user }: IUserContext,
        {
            challengeToken,
            name,
            registrationResponse,
            password,
            method,
            code,
            backupCode,
            passkeyChallengeToken,
            passkeyResponse,
            otp,
        }: MfaPasskeyRegisterRequestDto
    ): Promise<IResponseReturn<MfaPasskeyRegisterResponseDto>> {
        // Sequential by design: gates before the work they guard
        await this.mfaService.assertEnrolmentAllowed(EnumMfaMethod.passkey);
        const check = await this.userAuthService.assertReauthentication(
            requestContext,
            apiKeyContext,
            user,
            {
                action: EnumUserReauthenticationAction.mfaPasskeyRegister,
                password: password ?? null,
                method: method ?? null,
                code: code ?? null,
                backupCode: backupCode ?? null,
                passkeyChallengeToken: passkeyChallengeToken ?? null,
                passkeyResponse: passkeyResponse ?? null,
                otp: otp ?? null,
            }
        );
        const [webAuthnChallenge, maxPerUser] = await Promise.all([
            this.mfaChallengeService.getWebAuthnChallengeForUser(
                challengeToken,
                EnumMfaChallengePurpose.registration,
                authContext.userId
            ),
            this.mfaPasskeyService.getMaxPerUser(),
        ]);

        try {
            return await this.databaseService.withTransaction(async tx => {
                await this.userAuthService.completeReauthenticationInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    check
                );
                await this.mfaChallengeService.consumeInTx(
                    tx,
                    challengeToken,
                    EnumMfaChallengePurpose.registration,
                    authContext.userId
                );
                const passkey = await this.mfaPasskeyService.registerInTx(
                    tx,
                    authContext.userId,
                    name,
                    registrationResponse,
                    webAuthnChallenge,
                    maxPerUser
                );
                const backupCodes = await this.mfaService.createBackupCodesInTx(
                    tx,
                    authContext.userId
                );
                const entry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    { action: EnumActivityLogAction.userRegisterMfaPasskey }
                );
                await this.outboxService.addInTx(tx, entry);

                return { data: { passkey, backupCodes } };
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw check.mfa !== null
                    ? new MfaInvalidException()
                    : new MfaChallengeInvalidException();
            }

            throw new AppUnknownException(err);
        }
    }
}

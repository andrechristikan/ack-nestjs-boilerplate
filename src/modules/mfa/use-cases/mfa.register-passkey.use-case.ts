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
import type { IMfaPasskeyRegistration } from '@modules/mfa/interfaces/mfa.interface';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaPasskeyAlreadyRegisteredException } from '@modules/mfa/exceptions/mfa.passkey-already-registered.exception';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { Injectable } from '@nestjs/common';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';

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

    private async getRegistration(
        userId: string,
        challengeToken: string,
        registrationResponse: RegistrationResponseJSON
    ): Promise<IMfaPasskeyRegistration> {
        const webAuthnChallenge =
            await this.mfaChallengeService.getWebAuthnChallengeForUser(
                challengeToken,
                EnumMfaChallengePurpose.registration,
                userId
            );

        return this.mfaPasskeyService.assertRegistrable(
            userId,
            registrationResponse,
            webAuthnChallenge
        );
    }

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
        const [registration] = await Promise.all([
            this.getRegistration(
                authContext.userId,
                challengeToken,
                registrationResponse
            ),
            this.mfaService.assertEnrolmentAllowed(EnumMfaMethod.passkey),
        ]);
        // Sequential by design: a credential proof, awaited alone
        const { check, failure } =
            await this.userAuthService.checkReauthentication(user, {
                action: EnumUserReauthenticationAction.mfaPasskeyRegister,
                password: password ?? null,
                method: method ?? null,
                code: code ?? null,
                backupCode: backupCode ?? null,
                passkeyChallengeToken: passkeyChallengeToken ?? null,
                passkeyResponse: passkeyResponse ?? null,
                otp: otp ?? null,
            });
        if (failure !== null) {
            const isLocked = await this.databaseService.withTransaction(
                async tx =>
                    this.userAuthService.countFailedReauthenticationInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext,
                        failure
                    )
            );

            return this.userAuthService.throwFailedReauthentication(
                failure,
                isLocked
            );
        }

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
                    registration
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
                    { action: EnumActivityLogAction.userMfaPasskeyRegistered }
                );
                await this.outboxService.addInTx(tx, entry);

                return { data: { passkey, backupCodes } };
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isCredentialCollision = this.databaseUtil.isUniqueCollision(
                err,
                'credentialId'
            );
            if (isCredentialCollision) {
                throw new MfaPasskeyAlreadyRegisteredException();
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

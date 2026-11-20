import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/server';
import { EnumMfaChallengePurpose } from '@generated/prisma-client/client';
import { DatabaseService } from '@common/database/services/database.service';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaGeneratePasskeyRegistrationUseCase } from '@modules/mfa/use-cases/mfa.generate-passkey-registration.use-case';
import {
    buildAuthJwtAccessContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('MfaGeneratePasskeyRegistrationUseCase', () => {
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();

    let useCase: MfaGeneratePasskeyRegistrationUseCase;

    const user = buildUser('user-quartz', 'quartz@example.com');
    const authContext = buildAuthJwtAccessContext(user.id);
    const userContext = buildUserContext(user);
    const passkeyOptions = {
        challenge: 'challenge-quartz',
    } as PublicKeyCredentialCreationOptionsJSON;

    beforeEach(async () => {
        mfaPasskeyService.getRegistrationOptions.mockResolvedValue(
            passkeyOptions
        );
        mfaChallengeService.create.mockResolvedValue({
            challengeToken: 'token-quartz',
            expiresInMs: 300000,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaGeneratePasskeyRegistrationUseCase,
                { provide: MfaService, useValue: mfaService },
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                { provide: DatabaseService, useValue: databaseService },
            ],
        }).compile();
        useCase = module.get(MfaGeneratePasskeyRegistrationUseCase);
    });

    describe('execute', () => {
        it('rejects with the enrolment gate exception and calls no other collaborator', async () => {
            const failure = new FeatureFlagDisabledException();
            mfaService.assertEnrolmentAllowed.mockRejectedValue(failure);

            await expect(
                useCase.execute(authContext, userContext)
            ).rejects.toBe(failure);

            expect(mfaService.assertEnrolmentAllowed).toHaveBeenCalledWith(
                EnumMfaMethod.passkey
            );
            expect(
                mfaPasskeyService.getRegistrationOptions
            ).not.toHaveBeenCalled();
            expect(mfaChallengeService.create).not.toHaveBeenCalled();
        });

        it('reads the options for the caller, stores the challenge of the options as a registration challenge without a transaction, and answers the token with the options', async () => {
            await expect(
                useCase.execute(authContext, userContext)
            ).resolves.toEqual({
                data: {
                    challengeToken: 'token-quartz',
                    expiresInMs: 300000,
                    passkeyOptions,
                },
            });

            expect(
                mfaPasskeyService.getRegistrationOptions
            ).toHaveBeenCalledWith('user-quartz', 'quartz@example.com', 'jane');
            expect(mfaChallengeService.create).toHaveBeenCalledWith({
                purpose: EnumMfaChallengePurpose.registration,
                userId: 'user-quartz',
                device: null,
                loginFrom: null,
                loginWith: null,
                webAuthnChallenge: 'challenge-quartz',
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });
    });
});

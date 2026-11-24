import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
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
        it('rejects with the enrollment gate exception and calls no other collaborator', async () => {
            const failure = new FeatureFlagDisabledException();
            mfaService.assertEnrollmentAllowed.mockRejectedValue(failure);

            await expect(
                useCase.execute(authContext, userContext)
            ).rejects.toBe(failure);

            expect(mfaService.assertEnrollmentAllowed).toHaveBeenCalledWith(
                EnumMfaMethod.passkey
            );
            expect(mfaChallengeService.create).not.toHaveBeenCalled();
        });

        it('reads the options and asserts the enrollment gate together', async () => {
            const gate = buildDeferred<void>();
            mfaService.assertEnrollmentAllowed.mockReturnValue(gate.promise);
            mfaPasskeyService.getRegistrationOptions.mockImplementation(
                async () => {
                    gate.resolve();
                    return passkeyOptions;
                }
            );

            await expect(
                useCase.execute(authContext, userContext)
            ).resolves.toMatchObject({ data: { passkeyOptions } });
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
            ).toHaveBeenCalledWith('user-quartz', 'jane');
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

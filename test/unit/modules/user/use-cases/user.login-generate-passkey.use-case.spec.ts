import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server';
import { EnumMfaChallengePurpose } from '@generated/prisma-client/client';
import { DatabaseService } from '@common/database/services/database.service';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { UserLoginGeneratePasskeyUseCase } from '@modules/user/use-cases/user.login-generate-passkey.use-case';

describe('UserLoginGeneratePasskeyUseCase', () => {
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();

    let useCase: UserLoginGeneratePasskeyUseCase;

    const passkeyOptions: PublicKeyCredentialRequestOptionsJSON = {
        challenge: 'challenge-bramble',
        rpId: 'example.test',
        allowCredentials: [],
        userVerification: 'required',
    };

    beforeEach(async () => {
        mfaPasskeyService.getAssertionOptions.mockResolvedValue(passkeyOptions);
        mfaChallengeService.create.mockResolvedValue({
            challengeToken: 'token-bramble',
            expiresInMs: 300000,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginGeneratePasskeyUseCase,
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                { provide: DatabaseService, useValue: databaseService },
            ],
        }).compile();
        useCase = module.get(UserLoginGeneratePasskeyUseCase);
    });

    describe('execute', () => {
        it('reads the options of no user, stores a passwordless challenge with no user and the options challenge without a transaction, and answers the token with the options', async () => {
            await expect(useCase.execute()).resolves.toEqual({
                data: {
                    challengeToken: 'token-bramble',
                    expiresInMs: 300000,
                    passkeyOptions,
                },
            });

            expect(mfaPasskeyService.getAssertionOptions).toHaveBeenCalledWith(
                []
            );
            expect(mfaChallengeService.create).toHaveBeenCalledWith({
                purpose: EnumMfaChallengePurpose.passwordless,
                userId: null,
                device: null,
                loginFrom: null,
                loginWith: null,
                webAuthnChallenge: 'challenge-bramble',
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });
    });
});

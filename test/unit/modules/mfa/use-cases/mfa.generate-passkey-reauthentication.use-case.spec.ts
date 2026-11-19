import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server';
import { EnumMfaChallengePurpose } from '@generated/prisma-client/client';
import { DatabaseService } from '@common/database/services/database.service';
import { MfaMethodUnavailableException } from '@modules/mfa/exceptions/mfa.method-unavailable.exception';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaGeneratePasskeyReauthenticationUseCase } from '@modules/mfa/use-cases/mfa.generate-passkey-reauthentication.use-case';
import { buildAuthJwtAccessContext } from '@test/unit/helpers/test.unit.request.helper';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';

describe('MfaGeneratePasskeyReauthenticationUseCase', () => {
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();

    let useCase: MfaGeneratePasskeyReauthenticationUseCase;

    const authContext = buildAuthJwtAccessContext('user-quartz');
    const credentials = [
        { credentialId: 'credential-quartz', transports: ['internal'] },
    ];
    const passkeyOptions = {
        challenge: 'challenge-quartz',
    } as PublicKeyCredentialRequestOptionsJSON;

    beforeEach(async () => {
        vi.resetAllMocks();
        mfaPasskeyService.getCredentialsByUser.mockResolvedValue(credentials);
        mfaPasskeyService.getAssertionOptions.mockResolvedValue(passkeyOptions);
        mfaChallengeService.create.mockResolvedValue({
            challengeToken: 'token-quartz',
            expiresInMs: 300000,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaGeneratePasskeyReauthenticationUseCase,
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                { provide: DatabaseService, useValue: databaseService },
            ],
        }).compile();
        useCase = module.get(MfaGeneratePasskeyReauthenticationUseCase);
    });

    describe('execute', () => {
        it('reads the assertion options of the caller, stores the challenge of the options as a reauthentication challenge of the caller without a transaction, and answers the token with the options', async () => {
            await expect(useCase.execute(authContext)).resolves.toEqual({
                data: {
                    challengeToken: 'token-quartz',
                    expiresInMs: 300000,
                    passkeyOptions,
                },
            });

            expect(mfaPasskeyService.assertHasPasskey).toHaveBeenCalledWith(
                credentials
            );
            expect(mfaPasskeyService.assertHasPasskey).toHaveBeenCalledBefore(
                mfaPasskeyService.getAssertionOptions
            );
            expect(
                mfaPasskeyService.getCredentialsByUser
            ).toHaveBeenCalledTimes(1);
            expect(mfaPasskeyService.getCredentialsByUser).toHaveBeenCalledWith(
                'user-quartz'
            );
            expect(
                mfaPasskeyService.getCredentialsByUser
            ).toHaveBeenCalledBefore(mfaPasskeyService.assertHasPasskey);
            expect(mfaPasskeyService.getAssertionOptions).toHaveBeenCalledWith(
                credentials
            );
            expect(mfaChallengeService.create).toHaveBeenCalledWith({
                purpose: EnumMfaChallengePurpose.reauthentication,
                userId: 'user-quartz',
                device: null,
                loginFrom: null,
                loginWith: null,
                webAuthnChallenge: 'challenge-quartz',
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws MfaMethodUnavailableException and stores no challenge for a user without a passkey', async () => {
            mfaPasskeyService.assertHasPasskey.mockImplementation(() => {
                throw new MfaMethodUnavailableException();
            });

            await expect(useCase.execute(authContext)).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.methodUnavailable,

                module: 'mfa',
                messagePath: 'mfa.error.methodUnavailable',
            });
            expect(
                mfaPasskeyService.getAssertionOptions
            ).not.toHaveBeenCalled();
            expect(mfaChallengeService.create).not.toHaveBeenCalled();
        });
    });
});

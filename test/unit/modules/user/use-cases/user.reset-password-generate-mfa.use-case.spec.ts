import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server';
import { EnumMfaChallengePurpose } from '@generated/prisma-client/client';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { IUserForgotPassword } from '@modules/user/interfaces/user.interface';
import { UserResetPasswordGenerateMfaUseCase } from '@modules/user/use-cases/user.reset-password-generate-mfa.use-case';

describe('UserResetPasswordGenerateMfaUseCase', () => {
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();

    let useCase: UserResetPasswordGenerateMfaUseCase;

    const resetRow = {
        id: 'forgot-linden',
        userId: 'user-linden',
    } as IUserForgotPassword;
    const passkeyOptions: PublicKeyCredentialRequestOptionsJSON = {
        challenge: 'challenge-linden',
        rpId: 'example.test',
        allowCredentials: [{ id: 'credential-linden', type: 'public-key' }],
        userVerification: 'required',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        userPasswordService.getOneActiveReset.mockResolvedValue(resetRow);
        mfaPasskeyService.getAssertionOptions.mockResolvedValue(passkeyOptions);
        mfaChallengeService.create.mockResolvedValue({
            challengeToken: 'token-linden',
            expiresInMs: 300000,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserResetPasswordGenerateMfaUseCase,
                { provide: UserPasswordService, useValue: userPasswordService },
                { provide: MfaService, useValue: mfaService },
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                { provide: DatabaseService, useValue: databaseService },
            ],
        }).compile();
        useCase = module.get(UserResetPasswordGenerateMfaUseCase);
    });

    describe('execute', () => {
        it('stores a resetPassword challenge of the token user with the options challenge without a transaction and answers the methods, token, and options when the user has a passkey', async () => {
            const methods = [
                EnumMfaMethod.totp,
                EnumMfaMethod.passkey,
                EnumMfaMethod.backupCode,
            ];
            mfaService.getLoginMethods.mockResolvedValue(methods);

            await expect(
                useCase.execute({ token: 'raw-token' })
            ).resolves.toEqual({
                data: {
                    methods,
                    challengeToken: 'token-linden',
                    expiresInMs: 300000,
                    passkeyOptions,
                },
            });

            expect(userPasswordService.getOneActiveReset).toHaveBeenCalledWith(
                'raw-token'
            );
            expect(mfaService.getLoginMethods).toHaveBeenCalledWith(
                'user-linden'
            );
            expect(mfaPasskeyService.getAssertionOptions).toHaveBeenCalledWith(
                'user-linden'
            );
            expect(mfaChallengeService.create).toHaveBeenCalledWith({
                purpose: EnumMfaChallengePurpose.resetPassword,
                userId: 'user-linden',
                device: null,
                loginFrom: null,
                loginWith: null,
                webAuthnChallenge: 'challenge-linden',
            });
        });

        it('answers the methods and three nulls without a challenge when the user has TOTP and no passkey', async () => {
            const methods = [EnumMfaMethod.totp, EnumMfaMethod.backupCode];
            mfaService.getLoginMethods.mockResolvedValue(methods);

            await expect(
                useCase.execute({ token: 'raw-token' })
            ).resolves.toEqual({
                data: {
                    methods,
                    challengeToken: null,
                    expiresInMs: null,
                    passkeyOptions: null,
                },
            });

            expect(
                mfaPasskeyService.getAssertionOptions
            ).not.toHaveBeenCalled();
            expect(mfaChallengeService.create).not.toHaveBeenCalled();
        });

        it('answers no methods and three nulls when MFA is off', async () => {
            mfaService.getLoginMethods.mockResolvedValue([]);

            await expect(
                useCase.execute({ token: 'raw-token' })
            ).resolves.toEqual({
                data: {
                    methods: [],
                    challengeToken: null,
                    expiresInMs: null,
                    passkeyOptions: null,
                },
            });

            expect(mfaChallengeService.create).not.toHaveBeenCalled();
        });

        it('throws the reset lookup error and reads nothing else when the token is invalid', async () => {
            userPasswordService.getOneActiveReset.mockRejectedValue(
                new UserTokenInvalidException()
            );

            await expect(
                useCase.execute({ token: 'raw-token' })
            ).rejects.toBeInstanceOf(UserTokenInvalidException);

            expect(mfaService.getLoginMethods).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });
    });
});

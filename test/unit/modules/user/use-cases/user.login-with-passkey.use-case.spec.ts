import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { Test } from '@nestjs/testing';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumDevicePlatform,
    EnumMfaChallengePurpose,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { MfaPasskey } from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaAttemptMaxException } from '@modules/mfa/exceptions/mfa.attempt-max.exception';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import { MfaPasskeyInvalidException } from '@modules/mfa/exceptions/mfa.passkey-invalid.exception';
import type {
    IMfaChallenge,
    IMfaCheck,
} from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserCredentialInvalidException } from '@modules/user/exceptions/user.credential-invalid.exception';
import type { IUserLoginSession } from '@modules/user/interfaces/user.login.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserLoginWithPasskeyUseCase } from '@modules/user/use-cases/user.login-with-passkey.use-case';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import {
    buildApiKeyContext,
    buildRequestContext,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserLoginWithPasskeyUseCase', () => {
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: UserLoginWithPasskeyUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const now = new Date('2026-03-01T00:00:00.000Z');
    const lastWorkspaceChangedAt = new Date('2026-02-01T00:00:00.000Z');
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleKey: EnumRolePlatformKey.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const deviceIdentity = {
        fingerprint: 'device-bramble',
        name: null,
        platform: EnumDevicePlatform.web,
        notificationToken: null,
    };
    const baseUser = {
        ...buildUser('user-bramble', 'bramble@example.com'),
        isVerified: true,
        lastWorkspaceId: 'workspace-bramble',
        lastWorkspaceChangedAt,
    };
    const session: IUserLoginSession = {
        tokens,
        sessionId: 'session-bramble',
    };
    const challenge: IMfaChallenge = {
        userId: null,
        purpose: EnumMfaChallengePurpose.passwordless,
        webAuthnChallenge: 'challenge-webauthn',
        device: null,
        loginFrom: null,
        loginWith: null,
    };
    const passkeyResponse = {
        id: 'credential-one',
        rawId: 'credential-one',
        response: {
            clientDataJSON: 'client-data',
            authenticatorData: 'authenticator-data',
            signature: 'signature',
        },
        clientExtensionResults: {},
        type: 'public-key',
    } satisfies AuthenticationResponseJSON;
    const storedPasskey = {
        id: 'passkey-one',
        userId: 'user-bramble',
        credentialId: 'credential-one',
    } as MfaPasskey;
    const checked: IMfaCheck = {
        method: EnumMfaMethod.passkey,
        totpStep: null,
        backupCodeHash: null,
        passkey: { id: 'passkey-one', counter: 8 },
    };
    const dto = {
        challengeToken: 'challenge-token',
        passkeyResponse,
        from: EnumUserLoginFrom.website,
        device: {
            fingerprint: 'device-bramble',
            platform: EnumDevicePlatform.web,
        },
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(now);
        deviceUtil.toIdentity.mockReturnValue(deviceIdentity);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        mfaChallengeService.get.mockResolvedValue(challenge);
        mfaPasskeyService.getOneForLogin.mockResolvedValue(storedPasskey);
        userAuthService.getOneForPasskeyLogin.mockResolvedValue(baseUser);
        mfaService.checkPasskeyLogin.mockResolvedValue(checked);
        workspaceMemberService.resolveLastWorkspaceId.mockResolvedValue(
            'workspace-bramble'
        );
        userAuthService.createTokenAndSessionInTx.mockResolvedValue(session);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginWithPasskeyUseCase,
                { provide: MfaService, useValue: mfaService },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: UserAuthService, useValue: userAuthService },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserLoginWithPasskeyUseCase);
    });

    describe('execute', () => {
        it('creates the session with loginWith passkey and calls no password check and no MFA challenge', async () => {
            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: {
                    isMfaRequired: false,
                    tokens,
                    lastWorkspaceId: 'workspace-bramble',
                    lastWorkspaceChangedAt,
                },
            });

            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.passkey,
                now
            );
            expect(userAuthService.isCredentialMatch).not.toHaveBeenCalled();
            expect(
                userAuthService.assertPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.assertPasswordNotExpired
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createMfaChallengeInTx
            ).not.toHaveBeenCalled();
        });

        it('reads the passwordless challenge, the passkey, the user, and the lock, checks the assertion with the challenge WebAuthn value, then claims, completes, and issues the session on one tx', async () => {
            const callOrder: string[] = [];
            mfaChallengeService.get.mockImplementation(async () => {
                callOrder.push('get');

                return challenge;
            });
            mfaPasskeyService.getOneForLogin.mockImplementation(async () => {
                callOrder.push('getOneForLogin');

                return storedPasskey;
            });
            userAuthService.getOneForPasskeyLogin.mockImplementation(
                async () => {
                    callOrder.push('getOneForPasskeyLogin');

                    return baseUser;
                }
            );
            mfaService.assertAttemptAvailable.mockImplementation(async () => {
                callOrder.push('assertAttemptAvailable');
            });
            mfaService.checkPasskeyLogin.mockImplementation(async () => {
                callOrder.push('check');

                return checked;
            });
            workspaceMemberService.resolveLastWorkspaceId.mockImplementation(
                async () => {
                    callOrder.push('resolveLastWorkspaceId');

                    return 'workspace-bramble';
                }
            );
            mfaChallengeService.consumeInTx.mockImplementation(async () => {
                callOrder.push('consumeInTx');
            });
            mfaService.completeInTx.mockImplementation(async () => {
                callOrder.push('completeInTx');
            });
            userAuthService.createTokenAndSessionInTx.mockImplementation(
                async () => {
                    callOrder.push('createTokenAndSessionInTx');

                    return session;
                }
            );

            await useCase.execute(requestContext, apiKeyContext, dto);

            expect(mfaChallengeService.get).toHaveBeenCalledWith(
                'challenge-token',
                EnumMfaChallengePurpose.passwordless
            );
            expect(mfaPasskeyService.getOneForLogin).toHaveBeenCalledWith(
                'credential-one'
            );
            expect(userAuthService.getOneForPasskeyLogin).toHaveBeenCalledWith(
                'user-bramble'
            );
            expect(mfaService.assertAttemptAvailable).toHaveBeenCalledWith(
                'user-bramble'
            );
            expect(mfaService.checkPasskeyLogin).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                'user-bramble',
                passkeyResponse,
                'challenge-webauthn'
            );
            expect(mfaService.check).not.toHaveBeenCalled();
            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', 'workspace-bramble');
            expect(mfaChallengeService.consumeInTx).toHaveBeenCalledWith(
                tx,
                'challenge-token',
                EnumMfaChallengePurpose.passwordless,
                'user-bramble'
            );
            expect(mfaService.completeInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                checked
            );
            expect(callOrder).toEqual([
                'get',
                'getOneForLogin',
                'getOneForPasskeyLogin',
                'assertAttemptAvailable',
                'check',
                'resolveLastWorkspaceId',
                'consumeInTx',
                'completeInTx',
                'createTokenAndSessionInTx',
            ]);
        });

        it('answers a null lastWorkspaceId when the user left that workspace', async () => {
            workspaceMemberService.resolveLastWorkspaceId.mockResolvedValue(
                null
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: {
                    isMfaRequired: false,
                    tokens,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt,
                },
            });
        });

        it('refuses a token of another purpose before reading the passkey', async () => {
            mfaChallengeService.get.mockImplementation(
                async (_token, purpose) => {
                    if (purpose !== EnumMfaChallengePurpose.passwordless) {
                        return { ...challenge, purpose };
                    }

                    throw new MfaChallengeInvalidException();
                }
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.challengeInvalid,
            });
            expect(mfaPasskeyService.getOneForLogin).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('passes on the MfaPasskeyInvalidException of an unknown credential and counts nothing', async () => {
            mfaPasskeyService.getOneForLogin.mockRejectedValue(
                new MfaPasskeyInvalidException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyInvalid,
            });
            expect(
                userAuthService.getOneForPasskeyLogin
            ).not.toHaveBeenCalled();
            expect(mfaService.checkPasskeyLogin).not.toHaveBeenCalled();
            expect(mfaService.countFailedAttempt).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('answers UserCredentialInvalidException for an inactive user and checks nothing', async () => {
            userAuthService.getOneForPasskeyLogin.mockRejectedValue(
                new UserCredentialInvalidException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
            });
            expect(mfaService.assertAttemptAvailable).not.toHaveBeenCalled();
            expect(mfaService.checkPasskeyLogin).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws MfaAttemptMaxException for a locked user and checks nothing', async () => {
            mfaService.assertAttemptAvailable.mockRejectedValue(
                new MfaAttemptMaxException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
            expect(mfaService.checkPasskeyLogin).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('issues nothing and opens no transaction when the check fails', async () => {
            mfaService.checkPasskeyLogin.mockRejectedValue(
                new MfaPasskeyInvalidException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.passkeyInvalid,
            });
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('creates no session when the challenge claim is lost', async () => {
            const failure = new MfaChallengeInvalidException();
            mfaChallengeService.consumeInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
            expect(mfaService.completeInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('throws MfaChallengeInvalidException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.challengeInvalid,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps an unknown error of the transaction in AppUnknownException', async () => {
            const cause = new Error('boom');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});

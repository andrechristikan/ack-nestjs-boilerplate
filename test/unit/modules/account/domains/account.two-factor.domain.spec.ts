import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { AccountLoginDomain } from '@modules/account/domains/account.login.domain';
import { AccountTwoFactorDomain } from '@modules/account/domains/account.two-factor.domain';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type {
    IAuthToken,
    IAuthTwoFactorChallengeCache,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';

describe('AccountTwoFactorDomain', () => {
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const authTwoFactorDomain: MockProxy<AuthTwoFactorDomain> =
        mock<AuthTwoFactorDomain>();
    const accountLoginDomain: MockProxy<AccountLoginDomain> =
        mock<AccountLoginDomain>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let domain: AccountTwoFactorDomain;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const baseTwoFactor: TwoFactor = {
        id: 'two-factor-quartz',
        userId: 'user-quartz',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: true,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const baseUser: IUser = {
        id: 'user-quartz',
        name: 'Quartz Cole',
        username: 'quartzCole',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'quartz@example.com',
        roleId: 'role-quartz',
        password: 'hashed-password',
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-quartz',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-quartz',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: baseTwoFactor,
    };
    const verifiedResult: IAuthTwoFactorVerifyResult = {
        isValid: true,
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };
    const challenge: IAuthTwoFactorChallengeCache = {
        userId: 'user-quartz',
        device: {
            fingerprint: 'device-quartz',
            name: null,
            platform: null,
            notificationToken: null,
        },
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    };
    const issued: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        sessionDomain.revokeActiveByUserInTx.mockResolvedValue(revoked);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AccountTwoFactorDomain,
                {
                    provide: UserTwoFactorDomain,
                    useValue: userTwoFactorDomain,
                },
                {
                    provide: AuthTwoFactorDomain,
                    useValue: authTwoFactorDomain,
                },
                { provide: AccountLoginDomain, useValue: accountLoginDomain },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        domain = module.get(AccountTwoFactorDomain);
    });

    describe('disable', () => {
        it('clears the two-factor then revokes the sessions on one transaction attributed to the owner', async () => {
            const calls: string[] = [];
            userTwoFactorDomain.disableInTx.mockImplementation(async () => {
                calls.push('disable');
            });
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revoke');

                    return revoked;
                }
            );

            await expect(domain.disable('user-hollow')).resolves.toBe(revoked);

            expect(calls).toEqual(['disable', 'revoke']);
            expect(userTwoFactorDomain.disableInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow'
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                'user-hollow',
                now
            );
        });

        it('wraps a failure in the unknown exception', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Error('down')
            );

            await expect(domain.disable('user-hollow')).rejects.toMatchObject({
                statusCode: EnumAppStatusCodeError.unknown,
            });
        });
    });

    describe('resetByAdmin', () => {
        it('resets the two-factor then revokes the sessions on one transaction attributed to the admin', async () => {
            const calls: string[] = [];
            userTwoFactorDomain.resetByAdminInTx.mockImplementation(
                async () => {
                    calls.push('reset');
                }
            );
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revoke');

                    return revoked;
                }
            );

            await expect(
                domain.resetByAdmin('user-hollow', 'admin-one')
            ).resolves.toBe(revoked);

            expect(calls).toEqual(['reset', 'revoke']);
            expect(userTwoFactorDomain.resetByAdminInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow'
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                'admin-one',
                now
            );
        });

        it('wraps a failure in the unknown exception', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Error('down')
            );

            await expect(
                domain.resetByAdmin('user-hollow', 'admin-one')
            ).rejects.toMatchObject({
                statusCode: EnumAppStatusCodeError.unknown,
            });
        });
    });

    describe('verify', () => {
        const input = {
            method: EnumAuthTwoFactorMethod.code,
            code: '123456',
            backupCode: null,
        };

        it('counts the attempt, verifies the code, and resets the counter in order', async () => {
            const callOrder: string[] = [];
            authTwoFactorDomain.assertUnlocked.mockImplementation(async () => {
                callOrder.push('assertUnlocked');
            });
            userTwoFactorDomain.incrementAttempt.mockImplementation(
                async () => {
                    callOrder.push('incrementAttempt');

                    return 2;
                }
            );
            authTwoFactorDomain.assertAttemptAllowed.mockImplementation(
                async () => {
                    callOrder.push('assertAttemptAllowed');
                }
            );
            authTwoFactorDomain.verifyTwoFactor.mockImplementation(async () => {
                callOrder.push('verifyTwoFactor');

                return verifiedResult;
            });
            userTwoFactorDomain.resetAttempt.mockImplementation(async () => {
                callOrder.push('resetAttempt');
            });

            await expect(domain.verify(baseUser, input)).resolves.toBe(
                verifiedResult
            );
            expect(
                authTwoFactorDomain.assertAttemptAllowed
            ).toHaveBeenCalledWith(baseUser, 2);
            expect(authTwoFactorDomain.verifyTwoFactor).toHaveBeenCalledWith(
                baseTwoFactor,
                input
            );
            expect(userTwoFactorDomain.resetAttempt).toHaveBeenCalledWith(
                'user-quartz'
            );
            expect(callOrder).toEqual([
                'assertUnlocked',
                'incrementAttempt',
                'assertAttemptAllowed',
                'verifyTwoFactor',
                'resetAttempt',
            ]);
        });

        it('throws the lock exception without counting while locked', async () => {
            const lock = new UserNotFoundException();
            authTwoFactorDomain.assertUnlocked.mockRejectedValue(lock);

            await expect(domain.verify(baseUser, input)).rejects.toBe(lock);
            expect(userTwoFactorDomain.incrementAttempt).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorMethodRequiredException without counting when no method is given', async () => {
            await expect(
                domain.verify(baseUser, { ...input, method: null })
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorMethodRequired,
                messagePath: 'auth.error.twoFactorMethodRequired',
            });
            expect(userTwoFactorDomain.incrementAttempt).not.toHaveBeenCalled();
        });

        it('throws the lock exception without verifying when the count reaches the max', async () => {
            const lock = new UserNotFoundException();
            userTwoFactorDomain.incrementAttempt.mockResolvedValue(5);
            authTwoFactorDomain.assertAttemptAllowed.mockRejectedValue(lock);

            await expect(domain.verify(baseUser, input)).rejects.toBe(lock);
            expect(authTwoFactorDomain.verifyTwoFactor).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorInvalidException without resetting the counter on a wrong code', async () => {
            userTwoFactorDomain.incrementAttempt.mockResolvedValue(1);
            authTwoFactorDomain.verifyTwoFactor.mockResolvedValue({
                ...verifiedResult,
                isValid: false,
            });

            await expect(domain.verify(baseUser, input)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                messagePath: 'auth.error.twoFactorInvalid',
            });
            expect(userTwoFactorDomain.resetAttempt).not.toHaveBeenCalled();
        });
    });

    describe('verifyIfEnabled', () => {
        it('answers null without verifying when two-factor is off', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };

            await expect(
                domain.verifyIfEnabled(user, {
                    method: null,
                    code: null,
                    backupCode: null,
                })
            ).resolves.toBeNull();
            expect(authTwoFactorDomain.assertUnlocked).not.toHaveBeenCalled();
        });

        it('answers the verification when two-factor is on', async () => {
            userTwoFactorDomain.incrementAttempt.mockResolvedValue(1);
            authTwoFactorDomain.verifyTwoFactor.mockResolvedValue(
                verifiedResult
            );

            await expect(
                domain.verifyIfEnabled(baseUser, {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                    backupCode: null,
                })
            ).resolves.toBe(verifiedResult);
        });
    });

    describe('verifySetupCode', () => {
        it('counts the attempt, checks the code against the pending secret, and resets the counter', async () => {
            userTwoFactorDomain.incrementAttempt.mockResolvedValue(1);
            authTwoFactorDomain.verifySetupCode.mockReturnValue(true);

            await domain.verifySetupCode(baseUser, 'pending-secret', '123456');

            expect(authTwoFactorDomain.assertUnlocked).toHaveBeenCalledWith(
                baseUser
            );
            expect(
                authTwoFactorDomain.assertAttemptAllowed
            ).toHaveBeenCalledWith(baseUser, 1);
            expect(authTwoFactorDomain.verifySetupCode).toHaveBeenCalledWith(
                'pending-secret',
                'user-quartz',
                '123456'
            );
            expect(userTwoFactorDomain.resetAttempt).toHaveBeenCalledWith(
                'user-quartz'
            );
        });

        it('throws AuthTwoFactorInvalidException without resetting the counter on a wrong code', async () => {
            userTwoFactorDomain.incrementAttempt.mockResolvedValue(1);
            authTwoFactorDomain.verifySetupCode.mockReturnValue(false);

            await expect(
                domain.verifySetupCode(baseUser, 'pending-secret', '000000')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
            expect(userTwoFactorDomain.resetAttempt).not.toHaveBeenCalled();
        });

        it('throws the lock exception before verifying the code when the count reaches the max', async () => {
            const lock = new UserNotFoundException();
            userTwoFactorDomain.incrementAttempt.mockResolvedValue(5);
            authTwoFactorDomain.assertAttemptAllowed.mockRejectedValue(lock);

            await expect(
                domain.verifySetupCode(baseUser, 'pending-secret', '123456')
            ).rejects.toBe(lock);
            expect(authTwoFactorDomain.verifySetupCode).not.toHaveBeenCalled();
        });
    });

    describe('setup', () => {
        const generated = {
            secret: 'secret',
            otpauthUrl: 'otpauth://totp/secret',
            encryptedSecret: 'encrypted-secret',
        };
        const disabledUser = {
            ...baseUser,
            twoFactor: { ...baseTwoFactor, enabled: false },
        };

        it('stores a fresh secret and answers the otpauth setup when two-factor is not enabled', async () => {
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue(generated);

            await expect(domain.setup(disabledUser, null)).resolves.toEqual({
                secret: 'secret',
                otpauthUrl: 'otpauth://totp/secret',
            });
            expect(authTwoFactorDomain.setupTwoFactor).toHaveBeenCalledWith(
                'user-quartz',
                'quartz@example.com'
            );
            expect(userTwoFactorDomain.saveSetup).toHaveBeenCalledWith(
                'user-quartz',
                'encrypted-secret'
            );
            expect(
                userTwoFactorDomain.saveSetupConsumingBackupCode
            ).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorBackupCodeRequiredException when enabled and no backup code is given', async () => {
            await expect(domain.setup(baseUser, null)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorBackupCodeRequired,
                messagePath: 'auth.error.twoFactorBackupCodeRequired',
            });
            expect(authTwoFactorDomain.assertUnlocked).not.toHaveBeenCalled();
        });

        it('consumes the verified backup code when re-setting up while enabled', async () => {
            const backupVerified = {
                ...verifiedResult,
                method: EnumAuthTwoFactorMethod.backupCodes,
                newBackupCodes: [],
            };
            userTwoFactorDomain.incrementAttempt.mockResolvedValue(1);
            authTwoFactorDomain.verifyTwoFactor.mockResolvedValue(
                backupVerified
            );
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue(generated);

            await domain.setup(baseUser, 'BACKUP1');

            expect(authTwoFactorDomain.verifyTwoFactor).toHaveBeenCalledWith(
                baseTwoFactor,
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    code: null,
                    backupCode: 'BACKUP1',
                }
            );
            expect(
                userTwoFactorDomain.saveSetupConsumingBackupCode
            ).toHaveBeenCalledWith(
                baseUser,
                'encrypted-secret',
                backupVerified
            );
            expect(userTwoFactorDomain.saveSetup).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised while setting up', async () => {
            const failure = new UserNotFoundException();
            authTwoFactorDomain.setupTwoFactor.mockRejectedValue(failure);

            await expect(domain.setup(disabledUser, null)).rejects.toBe(
                failure
            );
        });

        it('wraps an unknown error raised while setting up', async () => {
            const error = new Error('boom');
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue(generated);
            userTwoFactorDomain.saveSetup.mockRejectedValue(error);

            await expect(
                domain.setup(disabledUser, null)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: error,
            });
        });
    });

    describe('verifyLogin', () => {
        const input = {
            method: EnumAuthTwoFactorMethod.code,
            code: '123456',
            backupCode: null,
        };

        it('reads the challenge and its user, verifies the code, and answers all three', async () => {
            authTwoFactorDomain.getChallenge.mockResolvedValue(challenge);
            userTwoFactorDomain.getOneForLoginVerify.mockResolvedValue(
                baseUser
            );
            userTwoFactorDomain.incrementAttempt.mockResolvedValue(1);
            authTwoFactorDomain.verifyTwoFactor.mockResolvedValue(
                verifiedResult
            );

            await expect(
                domain.verifyLogin('challenge-token', input)
            ).resolves.toEqual({
                user: baseUser,
                challenge,
                verified: verifiedResult,
            });
            expect(authTwoFactorDomain.getChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(
                userTwoFactorDomain.getOneForLoginVerify
            ).toHaveBeenCalledWith('user-quartz');
        });

        it('throws AuthTwoFactorChallengeInvalidException when the challenge is missing', async () => {
            authTwoFactorDomain.getChallenge.mockResolvedValue(null);

            await expect(
                domain.verifyLogin('challenge-token', input)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
                messagePath: 'auth.error.twoFactorChallengeInvalid',
            });
            expect(
                userTwoFactorDomain.getOneForLoginVerify
            ).not.toHaveBeenCalled();
        });
    });

    describe('verifyLoginSetup', () => {
        it('reads the challenge and its user, verifies the setup code, and answers the user with the pending secret', async () => {
            authTwoFactorDomain.getChallenge.mockResolvedValue(challenge);
            userTwoFactorDomain.getOneForLoginSetup.mockResolvedValue({
                user: baseUser,
                pendingSecret: 'pending-secret',
            });
            userTwoFactorDomain.incrementAttempt.mockResolvedValue(1);
            authTwoFactorDomain.verifySetupCode.mockReturnValue(true);

            await expect(
                domain.verifyLoginSetup('challenge-token', '123456')
            ).resolves.toEqual({
                user: baseUser,
                pendingSecret: 'pending-secret',
            });
            expect(authTwoFactorDomain.verifySetupCode).toHaveBeenCalledWith(
                'pending-secret',
                'user-quartz',
                '123456'
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException when the challenge is missing', async () => {
            authTwoFactorDomain.getChallenge.mockResolvedValue(null);

            await expect(
                domain.verifyLoginSetup('challenge-token', '123456')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
            expect(
                userTwoFactorDomain.getOneForLoginSetup
            ).not.toHaveBeenCalled();
        });
    });

    describe('recordLoginVerification', () => {
        it('records the verified check', async () => {
            await domain.recordLoginVerification({
                user: baseUser,
                challenge,
                verified: verifiedResult,
            });

            expect(userTwoFactorDomain.recordVerification).toHaveBeenCalledWith(
                baseUser,
                verifiedResult
            );
        });

        it('rethrows an AppBaseException raised while recording', async () => {
            const failure = new UserNotFoundException();
            userTwoFactorDomain.recordVerification.mockRejectedValue(failure);

            await expect(
                domain.recordLoginVerification({
                    user: baseUser,
                    challenge,
                    verified: verifiedResult,
                })
            ).rejects.toBe(failure);
        });

        it('wraps an unknown error raised while recording', async () => {
            const error = new Error('boom');
            userTwoFactorDomain.recordVerification.mockRejectedValue(error);

            await expect(
                domain.recordLoginVerification({
                    user: baseUser,
                    challenge,
                    verified: verifiedResult,
                })
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: error,
            });
        });
    });

    describe('issueLoginTokens', () => {
        it('issues the session of the challenge and deletes the challenge', async () => {
            accountLoginDomain.createTokenAndSession.mockResolvedValue(issued);

            await expect(
                domain.issueLoginTokens(
                    { user: baseUser, challenge, verified: verifiedResult },
                    'challenge-token'
                )
            ).resolves.toBe(issued);
            expect(
                accountLoginDomain.createTokenAndSession
            ).toHaveBeenCalledWith(
                baseUser,
                challenge.device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );
            expect(authTwoFactorDomain.deleteChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
        });

        it('rethrows an AppBaseException raised while issuing', async () => {
            const failure = new UserNotFoundException();
            accountLoginDomain.createTokenAndSession.mockRejectedValue(failure);

            await expect(
                domain.issueLoginTokens(
                    { user: baseUser, challenge, verified: verifiedResult },
                    'challenge-token'
                )
            ).rejects.toBe(failure);
        });

        it('wraps an unknown error raised while issuing', async () => {
            const error = new Error('boom');
            accountLoginDomain.createTokenAndSession.mockRejectedValue(error);

            await expect(
                domain.issueLoginTokens(
                    { user: baseUser, challenge, verified: verifiedResult },
                    'challenge-token'
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: error,
            });
        });
    });
});

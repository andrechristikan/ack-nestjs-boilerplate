import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { TwoFactor } from '@generated/prisma-client/client';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { SentryService } from '@common/sentry/services/sentry.service';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type { AuthCache } from '@modules/auth/caches/auth.cache';
import type { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('AuthTwoFactorDomain', () => {
    const authTwoFactorUtil: MockProxy<AuthTwoFactorUtil> =
        mock<AuthTwoFactorUtil>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const authCache: MockProxy<AuthCache> = mock<AuthCache>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let AuthTwoFactorDomain: typeof import('@modules/auth/domains/auth.two-factor.domain').AuthTwoFactorDomain;
    let AppUnknownException: typeof import('@app/exceptions/app.unknown.exception').AppUnknownException;
    let HelperDecryptFailedException: typeof import('@common/helper/exceptions/helper.decrypt-failed.exception').HelperDecryptFailedException;
    let SentryServiceClass: typeof import('@common/sentry/services/sentry.service').SentryService;
    let AuthTwoFactorUtilClass: typeof import('@modules/auth/utils/auth.two-factor.util').AuthTwoFactorUtil;
    let AuthCacheClass: typeof import('@modules/auth/caches/auth.cache').AuthCache;
    let AuthTwoFactorAttemptTemporaryLockException: typeof import('@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception').AuthTwoFactorAttemptTemporaryLockException;

    let domain: InstanceType<typeof AuthTwoFactorDomain>;

    const twoFactor: TwoFactor = {
        id: 'two-factor-1',
        userId: 'user-1',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: [],
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
        id: 'user-1',
        name: 'Jane Doe',
        username: 'jane',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'jane@example.com',
        roleId: 'role-1',
        password: 'hashed-password',
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
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
            id: 'role-1',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        ({ AuthTwoFactorDomain } =
            await import('@modules/auth/domains/auth.two-factor.domain'));
        ({ AppUnknownException } =
            await import('@app/exceptions/app.unknown.exception'));
        ({ HelperDecryptFailedException } =
            await import('@common/helper/exceptions/helper.decrypt-failed.exception'));
        ({ SentryService: SentryServiceClass } =
            await import('@common/sentry/services/sentry.service'));
        ({ AuthTwoFactorUtil: AuthTwoFactorUtilClass } =
            await import('@modules/auth/utils/auth.two-factor.util'));
        ({ AuthCache: AuthCacheClass } =
            await import('@modules/auth/caches/auth.cache'));
        ({ AuthTwoFactorAttemptTemporaryLockException } =
            await import('@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception'));

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'auth.twoFactor.maxAttempt': 5,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthTwoFactorDomain,
                { provide: ConfigService, useValue: configService },
                {
                    provide: AuthTwoFactorUtilClass,
                    useValue: authTwoFactorUtil,
                },
                { provide: SentryServiceClass, useValue: sentryService },
                { provide: AuthCacheClass, useValue: authCache },
            ],
        }).compile();

        domain = module.get(AuthTwoFactorDomain);
    });

    describe('createChallenge', () => {
        it('stores the challenge payload and answers the token', async () => {
            const payload = {
                userId: 'user-1',
                device: {
                    fingerprint: 'device-1',
                    name: null,
                    platform: null,
                    notificationToken: null,
                },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            };
            authCache.setTwoFactorChallenge.mockResolvedValue({
                challengeToken: 'token-1',
                expiresInMs: 1000,
            });

            await expect(domain.createChallenge(payload)).resolves.toEqual({
                challengeToken: 'token-1',
                expiresInMs: 1000,
            });
            expect(authCache.setTwoFactorChallenge).toHaveBeenCalledWith(
                payload
            );
        });
    });

    describe('getChallenge', () => {
        it('returns the challenge of a token', async () => {
            const challenge = {
                userId: 'user-1',
                device: {
                    fingerprint: 'device-1',
                    name: null,
                    platform: null,
                    notificationToken: null,
                },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            };
            authCache.getTwoFactorChallenge.mockResolvedValue(challenge);

            await expect(domain.getChallenge('token-1')).resolves.toBe(
                challenge
            );
            expect(authCache.getTwoFactorChallenge).toHaveBeenCalledWith(
                'token-1'
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException when the token has no challenge', async () => {
            authCache.getTwoFactorChallenge.mockResolvedValue(null);

            await expect(domain.getChallenge('token-1')).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
        });
    });

    describe('deleteChallenge', () => {
        it('deletes the challenge of a token', async () => {
            await domain.deleteChallenge('token-1');

            expect(authCache.deleteTwoFactorChallenge).toHaveBeenCalledWith(
                'token-1'
            );
        });
    });

    describe('clearLock', () => {
        it('deletes the lock of the user', async () => {
            await domain.clearLock(baseUser);

            expect(authCache.deleteTwoFactorLock).toHaveBeenCalledWith(
                baseUser
            );
        });
    });

    describe('assertUnlocked', () => {
        it('resolves when there is no lock', async () => {
            authCache.getTwoFactorLockTtlInMs.mockResolvedValue(0);

            await expect(
                domain.assertUnlocked(baseUser)
            ).resolves.toBeUndefined();
        });

        it('throws AuthTwoFactorAttemptTemporaryLockException with the remaining seconds rounded up while locked', async () => {
            authCache.getTwoFactorLockTtlInMs.mockResolvedValue(1500);

            const call = domain.assertUnlocked(baseUser);

            await expect(call).rejects.toBeInstanceOf(
                AuthTwoFactorAttemptTemporaryLockException
            );
            await expect(call).rejects.toMatchObject({
                messageProperties: { retryAfterSeconds: 2 },
            });
        });
    });

    describe('assertAttemptAllowed', () => {
        const twoFactorUser: IUser = { ...baseUser, twoFactor };

        it('re-checks the lock a parallel request set when the count is below a multiple of the max', async () => {
            authCache.getTwoFactorLockTtlInMs.mockResolvedValue(0);

            await expect(
                domain.assertAttemptAllowed(twoFactorUser, 3)
            ).resolves.toBeUndefined();
            expect(authCache.setTwoFactorLock).not.toHaveBeenCalled();
            expect(authCache.getTwoFactorLockTtlInMs).toHaveBeenCalledWith(
                twoFactorUser
            );
        });

        it('throws AuthTwoFactorAttemptTemporaryLockException when a parallel request set the lock', async () => {
            authCache.getTwoFactorLockTtlInMs.mockResolvedValue(3000);

            await expect(
                domain.assertAttemptAllowed(twoFactorUser, 3)
            ).rejects.toBeInstanceOf(
                AuthTwoFactorAttemptTemporaryLockException
            );
            expect(authCache.setTwoFactorLock).not.toHaveBeenCalled();
        });

        it('locks with the count and throws on a multiple of the max', async () => {
            authCache.getTwoFactorLockTtlInMs.mockResolvedValue(30000);

            const call = domain.assertAttemptAllowed(twoFactorUser, 5);

            await expect(call).rejects.toBeInstanceOf(
                AuthTwoFactorAttemptTemporaryLockException
            );
            await expect(call).rejects.toMatchObject({
                messageProperties: { retryAfterSeconds: 30 },
            });
            expect(authCache.setTwoFactorLock).toHaveBeenCalledWith({
                ...twoFactorUser,
                twoFactor: { ...twoFactor, attempt: 5 },
            });
        });

        it('fails the request when the lock write fails', async () => {
            const failure = new Error('redis down');
            authCache.setTwoFactorLock.mockRejectedValue(failure);

            await expect(
                domain.assertAttemptAllowed(twoFactorUser, 10)
            ).rejects.toBe(failure);
        });
    });

    describe('assertMethodProvided', () => {
        it('passes when a method is given', () => {
            expect(() =>
                domain.assertMethodProvided(EnumAuthTwoFactorMethod.code)
            ).not.toThrow();
        });

        it('throws AuthTwoFactorMethodRequiredException when the method is null', () => {
            expect(() => domain.assertMethodProvided(null)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorMethodRequired,
                    messagePath: 'auth.error.twoFactorMethodRequired',
                })
            );
        });
    });

    describe('assertValid', () => {
        it('passes when the check is valid', () => {
            expect(() => domain.assertValid(true)).not.toThrow();
        });

        it('throws AuthTwoFactorInvalidException when the check is not valid', () => {
            expect(() => domain.assertValid(false)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                    messagePath: 'auth.error.twoFactorInvalid',
                })
            );
        });
    });

    describe('verifyTwoFactor', () => {
        it('answers invalid when the code method carries a blank code', async () => {
            const result = await domain.verifyTwoFactor(twoFactor, {
                method: EnumAuthTwoFactorMethod.code,
                code: '   ',
                backupCode: null,
            });

            expect(result).toEqual({
                isValid: false,
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            });
        });

        it('answers invalid when the backup-code method carries a blank code', async () => {
            const result = await domain.verifyTwoFactor(twoFactor, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                code: null,
                backupCode: null,
            });

            expect(result).toEqual({
                isValid: false,
                method: EnumAuthTwoFactorMethod.backupCodes,
                newBackupCodes: null,
            });
        });

        it('verifies a totp code against the decrypted secret', async () => {
            authTwoFactorUtil.decryptSecret.mockReturnValue('decrypted-secret');
            authTwoFactorUtil.verifyCode.mockReturnValue(true);

            const result = await domain.verifyTwoFactor(twoFactor, {
                method: EnumAuthTwoFactorMethod.code,
                code: ' 123456 ',
                backupCode: null,
            });

            expect(result).toEqual({
                isValid: true,
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            });
            expect(authTwoFactorUtil.decryptSecret).toHaveBeenCalledWith(
                'encrypted-secret',
                'user-1'
            );
            expect(authTwoFactorUtil.verifyCode).toHaveBeenCalledWith(
                'decrypted-secret',
                '123456'
            );
        });

        it('answers invalid when no backup codes are stored', async () => {
            const result = await domain.verifyTwoFactor(
                { ...twoFactor, backupCodes: [] },
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    code: null,
                    backupCode: 'BACKUP1',
                }
            );

            expect(result).toEqual({
                isValid: false,
                method: EnumAuthTwoFactorMethod.backupCodes,
                newBackupCodes: null,
            });
            expect(authTwoFactorUtil.verifyBackupCode).not.toHaveBeenCalled();
        });

        it('answers invalid when the backup code does not match any stored hash', async () => {
            authTwoFactorUtil.verifyBackupCode.mockReturnValue({
                isValid: false,
                index: -1,
            });

            const result = await domain.verifyTwoFactor(
                { ...twoFactor, backupCodes: ['hash-1', 'hash-2'] },
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    code: null,
                    backupCode: 'BACKUP1',
                }
            );

            expect(result).toEqual({
                isValid: false,
                method: EnumAuthTwoFactorMethod.backupCodes,
                newBackupCodes: null,
            });
        });

        it('consumes the matched backup code and returns the remaining codes', async () => {
            authTwoFactorUtil.verifyBackupCode.mockReturnValue({
                isValid: true,
                index: 1,
            });

            const result = await domain.verifyTwoFactor(
                { ...twoFactor, backupCodes: ['hash-1', 'hash-2', 'hash-3'] },
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    code: null,
                    backupCode: ' BACKUP1 ',
                }
            );

            expect(result).toEqual({
                isValid: true,
                method: EnumAuthTwoFactorMethod.backupCodes,
                newBackupCodes: ['hash-1', 'hash-3'],
            });
            expect(authTwoFactorUtil.verifyBackupCode).toHaveBeenCalledWith(
                ['hash-1', 'hash-2', 'hash-3'],
                'BACKUP1'
            );
        });
    });

    describe('verifySetupCode', () => {
        it('verifies a code against the decrypted pending secret', () => {
            authTwoFactorUtil.decryptSecret.mockReturnValue(
                'decrypted-pending-secret'
            );
            authTwoFactorUtil.verifyCode.mockReturnValue(true);

            const result = domain.verifySetupCode(
                'encrypted-pending-secret',
                'user-1',
                ' 123456 '
            );

            expect(result).toBe(true);
            expect(authTwoFactorUtil.decryptSecret).toHaveBeenCalledWith(
                'encrypted-pending-secret',
                'user-1'
            );
            expect(authTwoFactorUtil.verifyCode).toHaveBeenCalledWith(
                'decrypted-pending-secret',
                '123456'
            );
        });
    });

    describe('setupTwoFactor', () => {
        it('generates a secret, encrypts it and builds the otpauth url', async () => {
            authTwoFactorUtil.generateSecret.mockReturnValue(
                'generated-secret'
            );
            authTwoFactorUtil.encryptSecret.mockReturnValue('encrypted-secret');
            authTwoFactorUtil.createKeyUri.mockReturnValue(
                'otpauth://totp/uri'
            );

            const result = await domain.setupTwoFactor(
                'user-1',
                'jane@example.com'
            );

            expect(result).toEqual({
                otpauthUrl: 'otpauth://totp/uri',
                secret: 'generated-secret',
                encryptedSecret: 'encrypted-secret',
            });
            expect(authTwoFactorUtil.encryptSecret).toHaveBeenCalledWith(
                'generated-secret',
                'user-1'
            );
            expect(authTwoFactorUtil.createKeyUri).toHaveBeenCalledWith(
                'jane@example.com',
                'generated-secret'
            );
        });
    });

    describe('readSecret', () => {
        it('throws AuthTwoFactorSecretUnavailableException when no secret is stored', () => {
            let thrown: unknown;
            try {
                domain['readSecret'](null, 'user-1');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSecretUnavailable,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorSecretUnavailable
                    ],
                messagePath: 'auth.error.twoFactorSecretUnavailable',
            });
        });

        it('returns the decrypted secret when decryption succeeds', () => {
            authTwoFactorUtil.decryptSecret.mockReturnValue('decrypted-secret');

            const result = domain['readSecret']('encrypted-secret', 'user-1');

            expect(result).toBe('decrypted-secret');
        });

        it('reports and translates a decrypt failure into AuthTwoFactorSecretUnavailableException', () => {
            const decryptError = new HelperDecryptFailedException(
                new Error('tampered payload')
            );
            authTwoFactorUtil.decryptSecret.mockImplementation(() => {
                throw decryptError;
            });

            let thrown: unknown;
            try {
                domain['readSecret']('encrypted-secret', 'user-1');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSecretUnavailable,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorSecretUnavailable
                    ],
                messagePath: 'auth.error.twoFactorSecretUnavailable',
            });
            expect(sentryService.captureException).toHaveBeenCalledWith(
                decryptError
            );
        });

        it('wraps an error that is not a decrypt failure in AppUnknownException', () => {
            const otherError = new Error('unexpected');
            authTwoFactorUtil.decryptSecret.mockImplementation(() => {
                throw otherError;
            });

            let thrown: unknown;
            try {
                domain['readSecret']('encrypted-secret', 'user-1');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(AppUnknownException);
            expect(thrown).toMatchObject({ rawError: otherError });
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });
});

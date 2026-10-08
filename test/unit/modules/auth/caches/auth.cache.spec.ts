import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import type { IAuthTwoFactorChallengeCache } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('AuthCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let cache: AuthCache;

    const twoFactor: TwoFactor = {
        id: 'two-factor-1',
        userId: 'user-1',
        secret: null,
        pendingSecret: null,
        backupCodes: [],
        enabled: true,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        attempt: 5,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const userWithTwoFactor: IUser = {
        id: 'user-1',
        name: 'Jane Doe',
        username: 'jane',
        isVerified: true,
        verifiedAt: null,
        email: 'jane@example.com',
        roleId: 'role-1',
        password: 'hashed',
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
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: true,
        },
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
        twoFactor,
    };

    const device: IDeviceIdentity = {
        fingerprint: 'device-fingerprint-1',
        name: null,
        platform: null,
        notificationToken: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'auth.twoFactor.challengeKeyPattern':
                    'TwoFactorChallenge:{token}',
                'auth.twoFactor.challengeTtlInMs': 300000,
                'auth.twoFactor.lockKeyPattern': 'TwoFactorLock:{userId}',
                'auth.twoFactor.maxAttempt': 5,
                'auth.twoFactor.lockAttemptDurationInMs': 60000,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthCache,
                { provide: CacheMainProvider, useValue: cacheManager },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        cache = module.get(AuthCache);
    });

    describe('createChallenge', () => {
        it('stores the challenge payload under a random token with the configured ttl', async () => {
            helperStringService.random.mockReturnValue('random-token');
            const cachePayload: IAuthTwoFactorChallengeCache = {
                userId: 'user-1',
                device,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            };

            const result = await cache.createChallenge(cachePayload);

            expect(result).toEqual({
                challengeToken: 'random-token',
                expiresInMs: 300000,
            });
            expect(cacheManager.set).toHaveBeenCalledWith(
                'TwoFactorChallenge:random-token',
                cachePayload,
                300000
            );
        });
    });

    describe('getChallenge', () => {
        it('returns the cached challenge payload', async () => {
            const cachePayload: IAuthTwoFactorChallengeCache = {
                userId: 'user-1',
                device,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            };
            cacheManager.get.mockResolvedValue(cachePayload);

            const result = await cache.getChallenge('token-value');

            expect(result).toEqual(cachePayload);
            expect(cacheManager.get).toHaveBeenCalledWith(
                'TwoFactorChallenge:token-value'
            );
        });

        it('returns null when the challenge is not cached', async () => {
            cacheManager.get.mockResolvedValue(undefined);

            const result = await cache.getChallenge('token-value');

            expect(result).toBeNull();
        });
    });

    describe('clearChallenge', () => {
        it('deletes the challenge cache entry', async () => {
            await cache.clearChallenge('token-value');

            expect(cacheManager.del).toHaveBeenCalledWith(
                'TwoFactorChallenge:token-value'
            );
        });

        it('swallows a thrown store delete', async () => {
            cacheManager.del.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.clearChallenge('token-value')
            ).resolves.toBeUndefined();
        });
    });

    describe('lockTwoFactorAttempt', () => {
        it('locks with an exponential backoff ttl derived from the attempt count', async () => {
            const user = userWithTwoFactor;

            await cache.lockTwoFactorAttempt(user);

            expect(cacheManager.set).toHaveBeenCalledWith(
                'TwoFactorLock:user-1',
                true,
                2 ** (5 / 5) * 60000
            );
        });

        it('treats a missing two-factor record as zero attempts', async () => {
            const user = { ...userWithTwoFactor, twoFactor: null };

            await cache.lockTwoFactorAttempt(user);

            expect(cacheManager.set).toHaveBeenCalledWith(
                'TwoFactorLock:user-1',
                true,
                2 ** (0 / 5) * 60000
            );
        });

        it('propagates a thrown store write', async () => {
            cacheManager.set.mockImplementation(() => {
                throw new Error('redis down');
            });
            const user = {
                ...userWithTwoFactor,
                twoFactor: { ...twoFactor, attempt: 1 },
            };

            await expect(cache.lockTwoFactorAttempt(user)).rejects.toThrow(
                'redis down'
            );
        });
    });

    describe('getLockTwoFactorAttempt', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');

        beforeEach(() => {
            helperDateService.create.mockReturnValue(now);
            helperDateService.getTimestamp.mockReturnValue(now.getTime());
        });

        it('returns the remaining lock duration from the absolute expiry', async () => {
            cacheManager.ttl.mockResolvedValue(now.getTime() + 30000);

            const result =
                await cache.getLockTwoFactorAttempt(userWithTwoFactor);

            expect(result).toBe(30000);
            expect(cacheManager.ttl).toHaveBeenCalledWith(
                'TwoFactorLock:user-1'
            );
            expect(cacheManager.get).not.toHaveBeenCalled();
        });

        it('returns 0 when no lock entry exists', async () => {
            cacheManager.ttl.mockResolvedValue(undefined);

            const result =
                await cache.getLockTwoFactorAttempt(userWithTwoFactor);

            expect(result).toBe(0);
        });

        it('returns 0 when the expiry is already past', async () => {
            cacheManager.ttl.mockResolvedValue(now.getTime() - 1);

            const result =
                await cache.getLockTwoFactorAttempt(userWithTwoFactor);

            expect(result).toBe(0);
        });
    });

    describe('clearLockTwoFactorAttempt', () => {
        it('deletes the lock cache entry', async () => {
            const user = userWithTwoFactor;

            await cache.clearLockTwoFactorAttempt(user);

            expect(cacheManager.del).toHaveBeenCalledWith(
                'TwoFactorLock:user-1'
            );
        });

        it('swallows a thrown store delete', async () => {
            cacheManager.del.mockImplementation(() => {
                throw new Error('redis down');
            });
            const user = userWithTwoFactor;

            await expect(
                cache.clearLockTwoFactorAttempt(user)
            ).resolves.toBeUndefined();
        });
    });
});

import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import type { IAuthTwoFactorChallengeCache } from '@modules/auth/interfaces/auth.interface';
import type { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('AuthCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let cache: AuthCache;

    function buildUser(twoFactorAttempt: number | null): IUser {
        return {
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
            twoFactor:
                twoFactorAttempt === null
                    ? null
                    : {
                          id: 'two-factor-1',
                          userId: 'user-1',
                          secret: null,
                          pendingSecret: null,
                          backupCodes: [],
                          enabled: true,
                          requiredSetup: false,
                          confirmedAt: null,
                          lastUsedAt: null,
                          attempt: twoFactorAttempt,
                          createdAt: new Date('2026-01-01T00:00:00.000Z'),
                          createdBy: null,
                          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                          updatedBy: null,
                      },
        };
    }

    function buildDevice(): DeviceRequestDto {
        return { fingerprint: 'device-fingerprint-1' };
    }

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
            ],
        }).compile();

        cache = module.get(AuthCache);
    });

    describe('createChallenge', () => {
        it('stores the challenge payload under a random token with the configured ttl', async () => {
            helperStringService.random.mockReturnValue('random-token');
            const cachePayload: IAuthTwoFactorChallengeCache = {
                userId: 'user-1',
                device: buildDevice(),
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
                device: buildDevice(),
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
            const user = buildUser(5);

            await cache.lockTwoFactorAttempt(user);

            expect(cacheManager.set).toHaveBeenCalledWith(
                'TwoFactorLock:user-1',
                true,
                2 ** (5 / 5) * 60000
            );
        });

        it('treats a missing two-factor record as zero attempts', async () => {
            const user = buildUser(null);

            await cache.lockTwoFactorAttempt(user);

            expect(cacheManager.set).toHaveBeenCalledWith(
                'TwoFactorLock:user-1',
                true,
                2 ** (0 / 5) * 60000
            );
        });

        it('swallows a thrown store write', async () => {
            cacheManager.set.mockImplementation(() => {
                throw new Error('redis down');
            });
            const user = buildUser(1);

            await expect(
                cache.lockTwoFactorAttempt(user)
            ).resolves.toBeUndefined();
        });
    });

    describe('getLockTwoFactorAttempt', () => {
        it('returns the remaining lock duration when locked', async () => {
            cacheManager.get.mockResolvedValue(true);
            cacheManager.ttl.mockResolvedValue(30000);
            const user = buildUser(5);

            const result = await cache.getLockTwoFactorAttempt(user);

            expect(result).toBe(30000);
            expect(cacheManager.get).toHaveBeenCalledWith(
                'TwoFactorLock:user-1'
            );
            expect(cacheManager.ttl).toHaveBeenCalledWith(
                'TwoFactorLock:user-1'
            );
        });

        it('returns 0 when not locked', async () => {
            cacheManager.get.mockResolvedValue(false);
            cacheManager.ttl.mockResolvedValue(undefined);
            const user = buildUser(5);

            const result = await cache.getLockTwoFactorAttempt(user);

            expect(result).toBe(0);
        });

        it('returns 0 when locked but the ttl read answers undefined', async () => {
            cacheManager.get.mockResolvedValue(true);
            cacheManager.ttl.mockResolvedValue(undefined);
            const user = buildUser(5);

            const result = await cache.getLockTwoFactorAttempt(user);

            expect(result).toBe(0);
        });
    });

    describe('clearLockTwoFactorAttempt', () => {
        it('deletes the lock cache entry', async () => {
            const user = buildUser(5);

            await cache.clearLockTwoFactorAttempt(user);

            expect(cacheManager.del).toHaveBeenCalledWith(
                'TwoFactorLock:user-1'
            );
        });

        it('swallows a thrown store delete', async () => {
            cacheManager.del.mockImplementation(() => {
                throw new Error('redis down');
            });
            const user = buildUser(5);

            await expect(
                cache.clearLockTwoFactorAttempt(user)
            ).resolves.toBeUndefined();
        });
    });
});

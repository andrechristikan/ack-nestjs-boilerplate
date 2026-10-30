import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserTwoFactorCache } from '@modules/user/caches/user.two-factor.cache';

describe('UserTwoFactorCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let cache: UserTwoFactorCache;

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

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'auth.twoFactor.lockKeyPattern': 'TwoFactorLock:{userId}',
                'auth.twoFactor.maxAttempt': 5,
                'auth.twoFactor.lockAttemptDurationInMs': 60000,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserTwoFactorCache,
                { provide: CacheMainProvider, useValue: cacheManager },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        cache = module.get(UserTwoFactorCache);
    });

    describe('setTwoFactorLock', () => {
        it('locks with an exponential backoff ttl derived from the attempt count', async () => {
            const user = userWithTwoFactor;

            await cache.setTwoFactorLock(user);

            expect(cacheManager.set).toHaveBeenCalledWith(
                'TwoFactorLock:user-1',
                true,
                2 ** (5 / 5) * 60000
            );
        });

        it('treats a missing two-factor record as zero attempts', async () => {
            const user = { ...userWithTwoFactor, twoFactor: null };

            await cache.setTwoFactorLock(user);

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

            await expect(cache.setTwoFactorLock(user)).rejects.toThrow(
                'redis down'
            );
        });
    });

    describe('getTwoFactorLockTtlInMs', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');

        beforeEach(() => {
            helperDateService.create.mockReturnValue(now);
            helperDateService.getTimestamp.mockReturnValue(now.getTime());
        });

        it('returns the remaining lock duration from the absolute expiry', async () => {
            cacheManager.ttl.mockResolvedValue(now.getTime() + 30000);

            const result =
                await cache.getTwoFactorLockTtlInMs(userWithTwoFactor);

            expect(result).toBe(30000);
            expect(cacheManager.ttl).toHaveBeenCalledWith(
                'TwoFactorLock:user-1'
            );
            expect(cacheManager.get).not.toHaveBeenCalled();
        });

        it('returns 0 when no lock entry exists', async () => {
            cacheManager.ttl.mockResolvedValue(undefined);

            const result =
                await cache.getTwoFactorLockTtlInMs(userWithTwoFactor);

            expect(result).toBe(0);
        });

        it('returns 0 when the expiry is already past', async () => {
            cacheManager.ttl.mockResolvedValue(now.getTime() - 1);

            const result =
                await cache.getTwoFactorLockTtlInMs(userWithTwoFactor);

            expect(result).toBe(0);
        });
    });

    describe('deleteTwoFactorLock', () => {
        it('deletes the lock cache entry', async () => {
            const user = userWithTwoFactor;

            await cache.deleteTwoFactorLock(user);

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
                cache.deleteTwoFactorLock(user)
            ).resolves.toBeUndefined();
        });
    });
});

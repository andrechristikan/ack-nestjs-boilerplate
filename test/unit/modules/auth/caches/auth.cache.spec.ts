import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import type { IAuthTwoFactorChallengeCache } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';

describe('AuthCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let cache: AuthCache;

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

    describe('setTwoFactorChallenge', () => {
        it('stores the challenge payload under a random token with the configured ttl', async () => {
            helperStringService.random.mockReturnValue('random-token');
            const cachePayload: IAuthTwoFactorChallengeCache = {
                userId: 'user-1',
                device,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            };

            const result = await cache.setTwoFactorChallenge(cachePayload);

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

    describe('getTwoFactorChallenge', () => {
        it('returns the cached challenge payload', async () => {
            const cachePayload: IAuthTwoFactorChallengeCache = {
                userId: 'user-1',
                device,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            };
            cacheManager.get.mockResolvedValue(cachePayload);

            const result = await cache.getTwoFactorChallenge('token-value');

            expect(result).toEqual(cachePayload);
            expect(cacheManager.get).toHaveBeenCalledWith(
                'TwoFactorChallenge:token-value'
            );
        });

        it('returns null when the challenge is not cached', async () => {
            cacheManager.get.mockResolvedValue(undefined);

            const result = await cache.getTwoFactorChallenge('token-value');

            expect(result).toBeNull();
        });
    });

    describe('deleteTwoFactorChallenge', () => {
        it('deletes the challenge cache entry', async () => {
            await cache.deleteTwoFactorChallenge('token-value');

            expect(cacheManager.del).toHaveBeenCalledWith(
                'TwoFactorChallenge:token-value'
            );
        });

        it('swallows a thrown store delete', async () => {
            cacheManager.del.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.deleteTwoFactorChallenge('token-value')
            ).resolves.toBeUndefined();
        });
    });
});

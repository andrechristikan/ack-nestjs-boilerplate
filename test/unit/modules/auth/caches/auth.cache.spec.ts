import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import type Keyv from 'keyv';
import type KeyvRedis from '@keyv/redis';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';
import { stubStoreClient } from '@test/unit/helpers/test.unit.cache.helper';
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
    const keyv: MockProxy<Keyv> = mock<Keyv>();
    const store: MockProxy<KeyvRedis<string>> = mock<KeyvRedis<string>>();

    let cache: AuthCache;

    const device: IDeviceIdentity = {
        fingerprint: 'device-fingerprint-1',
        name: null,
        platform: null,
        notificationToken: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        (keyv as unknown as { store: KeyvRedis<string> }).store = store;

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
                { provide: RedisClientCachedProvider, useValue: keyv },
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

    describe('consumeTwoFactorChallenge', () => {
        const cachePayload: IAuthTwoFactorChallengeCache = {
            userId: 'user-1',
            device,
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
        };

        it('claims the challenge with GETDEL on the prefixed key and returns the deserialized payload', async () => {
            const client = stubStoreClient({ keyv, store });
            client.getDel.mockResolvedValue('serialized-challenge');
            keyv.deserializeData.mockResolvedValue({
                value: cachePayload,
            });

            const result = await cache.consumeTwoFactorChallenge('token-value');

            expect(result).toEqual(cachePayload);
            expect(store.createKeyPrefix).toHaveBeenCalledWith(
                'TwoFactorChallenge:token-value',
                'cache'
            );
            expect(client.getDel).toHaveBeenCalledWith(
                'prefixed-TwoFactorChallenge:token-value'
            );
            expect(keyv.deserializeData).toHaveBeenCalledWith(
                'serialized-challenge'
            );
        });

        it('returns null when no challenge is stored', async () => {
            const client = stubStoreClient({ keyv, store });
            client.getDel.mockResolvedValue(null);

            const result = await cache.consumeTwoFactorChallenge('token-value');

            expect(result).toBeNull();
            expect(keyv.deserializeData).not.toHaveBeenCalled();
        });

        it('returns null when the claimed value deserializes to nothing', async () => {
            const client = stubStoreClient({ keyv, store });
            client.getDel.mockResolvedValue('serialized-challenge');
            keyv.deserializeData.mockResolvedValue(undefined);

            const result = await cache.consumeTwoFactorChallenge('token-value');

            expect(result).toBeNull();
        });

        it('returns null when the deserialized entry carries no value', async () => {
            const client = stubStoreClient({ keyv, store });
            client.getDel.mockResolvedValue('serialized-challenge');
            keyv.deserializeData.mockResolvedValue({ value: undefined });

            const result = await cache.consumeTwoFactorChallenge('token-value');

            expect(result).toBeNull();
        });

        it('throws RedisUnavailableException when the store fails, not the invalid-challenge exception', async () => {
            const client = stubStoreClient({ keyv, store });
            client.getDel.mockRejectedValue(new Error('redis down'));

            await expect(
                cache.consumeTwoFactorChallenge('token-value')
            ).rejects.toMatchObject({
                module: 'redis',
                statusCode: EnumRedisStatusCodeError.unavailable,
                statusCodeKey:
                    EnumRedisStatusCodeError[
                        EnumRedisStatusCodeError.unavailable
                    ],
                messagePath: 'redis.error.unavailable',
            });
        });
    });
});

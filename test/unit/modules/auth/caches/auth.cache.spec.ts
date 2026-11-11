import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RedisCacheClient } from '@common/redis/constants/redis.constant';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';
import type { IStubCacheClient } from '@test/unit/helpers/test.unit.cache.helper';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumDevicePlatform,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import type { IAuthTwoFactorChallengeCache } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';

describe('AuthCache', () => {
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const redis: MockProxy<IStubCacheClient> = mock<IStubCacheClient>();

    let cache: AuthCache;

    const device: IDeviceIdentity = {
        fingerprint: 'device-fingerprint-1',
        name: null,
        platform: EnumDevicePlatform.web,
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
                { provide: RedisCacheClient, useValue: redis },
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
        it('stores the challenge payload as JSON under a random token with the configured ttl as PX', async () => {
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
            expect(redis.set).toHaveBeenCalledWith(
                'TwoFactorChallenge:random-token',
                JSON.stringify(cachePayload),
                'PX',
                300000
            );
        });
    });

    describe('getTwoFactorChallenge', () => {
        it('returns the challenge payload parsed from the JSON entry', async () => {
            const cachePayload: IAuthTwoFactorChallengeCache = {
                userId: 'user-1',
                device,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            };
            redis.get.mockResolvedValue(JSON.stringify(cachePayload));

            const result = await cache.getTwoFactorChallenge('token-value');

            expect(result).toEqual(cachePayload);
            expect(redis.get).toHaveBeenCalledWith(
                'TwoFactorChallenge:token-value'
            );
        });

        it('returns null when the challenge is not cached', async () => {
            redis.get.mockResolvedValue(null);

            const result = await cache.getTwoFactorChallenge('token-value');

            expect(result).toBeNull();
        });

        it('rethrows a Redis error', async () => {
            const failure = new Error('Connection is closed.');
            redis.get.mockRejectedValue(failure);

            await expect(
                cache.getTwoFactorChallenge('token-value')
            ).rejects.toBe(failure);
        });
    });

    describe('consumeTwoFactorChallenge', () => {
        const cachePayload: IAuthTwoFactorChallengeCache = {
            userId: 'user-1',
            device,
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
        };

        it('claims the challenge with GETDEL on the unprefixed key and returns the parsed payload', async () => {
            redis.getdel.mockResolvedValue(JSON.stringify(cachePayload));

            const result = await cache.consumeTwoFactorChallenge('token-value');

            expect(result).toEqual(cachePayload);
            expect(redis.getdel).toHaveBeenCalledWith(
                'TwoFactorChallenge:token-value'
            );
        });

        it('returns null when no challenge is stored', async () => {
            redis.getdel.mockResolvedValue(null);

            const result = await cache.consumeTwoFactorChallenge('token-value');

            expect(result).toBeNull();
        });

        it('throws RedisUnavailableException when Redis fails, not the invalid-challenge exception', async () => {
            redis.getdel.mockRejectedValue(new Error('Connection is closed.'));

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

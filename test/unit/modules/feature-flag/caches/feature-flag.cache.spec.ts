import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import type Keyv from 'keyv';
import type KeyvRedis from '@keyv/redis';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    RedisClientCachedProvider,
    RedisLeaseSetScript,
} from '@common/redis/constants/redis.constant';
import { stubStoreClient } from '@test/unit/helpers/test.unit.cache.helper';
import type { FeatureFlag } from '@generated/prisma-client/client';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';

describe('FeatureFlagCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const keyv: MockProxy<Keyv> = mock<Keyv>();
    const store: MockProxy<KeyvRedis<string>> = mock<KeyvRedis<string>>();

    let cache: FeatureFlagCache;

    const featureFlag: FeatureFlag = {
        id: '507f1f77bcf86cd799439011',
        key: 'loginWithGoogle',
        description: 'Enables Google sign-in',
        isEnable: true,
        rolloutPercent: 100,
        targetUserIds: [],
        metadata: { newFeature: true },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        (keyv as unknown as { store: KeyvRedis<string> }).store = store;
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'featureFlag.keyPattern': 'FeatureFlag:{key}',
                'featureFlag.cacheTtlInMs': 3600000,
                'featureFlag.leaseKeyPattern': 'FeatureFlag:Lease:{key}',
                'featureFlag.leaseTtlInMs': 10000,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagCache,
                { provide: CacheMainProvider, useValue: cacheManager },
                { provide: RedisClientCachedProvider, useValue: keyv },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
            ],
        }).compile();

        cache = module.get(FeatureFlagCache);
    });

    it('reads the key pattern and ttl config once, in the constructor', () => {
        expect(configGet).toHaveBeenCalledWith('featureFlag.keyPattern');
        expect(configGet).toHaveBeenCalledWith('featureFlag.cacheTtlInMs');
        expect(configGet).toHaveBeenCalledWith('featureFlag.leaseKeyPattern');
        expect(configGet).toHaveBeenCalledWith('featureFlag.leaseTtlInMs');
    });

    describe('getFeatureFlag', () => {
        it('returns the cached feature flag built from the key pattern', async () => {
            cacheManager.get.mockResolvedValue(featureFlag);

            const result = await cache.getFeatureFlag('loginWithGoogle');

            expect(result).toEqual(featureFlag);
            expect(cacheManager.get).toHaveBeenCalledWith(
                'FeatureFlag:loginWithGoogle'
            );
        });

        it('returns null on a cache miss', async () => {
            cacheManager.get.mockResolvedValue(undefined);

            const result = await cache.getFeatureFlag('loginWithGoogle');

            expect(result).toBeNull();
        });

        it('returns null when the store read throws', async () => {
            cacheManager.get.mockImplementation(() => {
                throw new Error('redis down');
            });

            const result = await cache.getFeatureFlag('loginWithGoogle');

            expect(result).toBeNull();
        });
    });

    describe('takeFeatureFlagLease', () => {
        it('takes the lease with SET NX PX and returns its random token', async () => {
            helperStringService.random.mockReturnValue('lease-token');
            const client = stubStoreClient({ keyv, store });
            client.set.mockResolvedValue('OK');

            const result = await cache.takeFeatureFlagLease('loginWithGoogle');

            expect(result).toBe('lease-token');
            expect(client.set).toHaveBeenCalledWith(
                'prefixed-FeatureFlag:Lease:loginWithGoogle',
                'lease-token',
                { expiration: { type: 'PX', value: 10000 }, condition: 'NX' }
            );
        });

        it('returns null when another reader holds the lease', async () => {
            helperStringService.random.mockReturnValue('lease-token');
            const client = stubStoreClient({ keyv, store });
            client.set.mockResolvedValue(null);

            const result = await cache.takeFeatureFlagLease('loginWithGoogle');

            expect(result).toBeNull();
        });

        it('returns null when the store fails', async () => {
            helperStringService.random.mockReturnValue('lease-token');
            const client = stubStoreClient({ keyv, store });
            client.set.mockRejectedValue(new Error('redis down'));

            const result = await cache.takeFeatureFlagLease('loginWithGoogle');

            expect(result).toBeNull();
        });
    });

    describe('setFeatureFlag', () => {
        it('runs the lease-held set script with the serialized flag and the configured ttl', async () => {
            const now = new Date('2026-01-03T00:00:00.000Z');
            helperDateService.create.mockReturnValue(now);
            const client = stubStoreClient({ keyv, store });
            client.eval.mockResolvedValue(1);

            await cache.setFeatureFlag(
                'loginWithGoogle',
                featureFlag,
                'lease-token'
            );

            expect(keyv.serializeData).toHaveBeenCalledWith({
                value: featureFlag,
                expires: now.getTime() + 3600000,
            });
            expect(client.eval).toHaveBeenCalledWith(RedisLeaseSetScript, {
                keys: [
                    'prefixed-FeatureFlag:loginWithGoogle',
                    'prefixed-FeatureFlag:Lease:loginWithGoogle',
                ],
                arguments: ['lease-token', 'serialized-value', '3600000'],
            });
            expect(cacheManager.set).not.toHaveBeenCalled();
        });

        it('swallows a failed script', async () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-01-03T00:00:00.000Z')
            );
            const client = stubStoreClient({ keyv, store });
            client.eval.mockRejectedValue(new Error('redis down'));

            await expect(
                cache.setFeatureFlag(
                    'loginWithGoogle',
                    featureFlag,
                    'lease-token'
                )
            ).resolves.toBeUndefined();
        });
    });

    describe('deleteFeatureFlag', () => {
        it('deletes the key built from the key pattern and its lease', async () => {
            await cache.deleteFeatureFlag('loginWithGoogle');

            expect(cacheManager.mdel).toHaveBeenCalledWith([
                'FeatureFlag:loginWithGoogle',
                'FeatureFlag:Lease:loginWithGoogle',
            ]);
        });

        it('rethrows a store failure so the admin request fails', async () => {
            const failure = new Error('redis down');
            cacheManager.mdel.mockRejectedValue(failure);

            await expect(
                cache.deleteFeatureFlag('loginWithGoogle')
            ).rejects.toBe(failure);
        });
    });
});

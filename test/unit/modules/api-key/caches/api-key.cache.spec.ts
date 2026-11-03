import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import type Keyv from 'keyv';
import type KeyvRedis from '@keyv/redis';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { RedisLeaseSetScript } from '@common/redis/constants/redis.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { stubStoreClient } from '@test/unit/helpers/test.unit.cache.helper';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';

describe('ApiKeyCache', () => {
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

    const apiKey: ApiKey = {
        id: 'api-key-1',
        name: 'Acme Api Key',
        type: EnumApiKeyType.default,
        key: 'local_abc123',
        hash: 'hashed-secret',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
    };

    let cache: ApiKeyCache;

    beforeEach(async () => {
        vi.resetAllMocks();
        (keyv as unknown as { store: KeyvRedis<string> }).store = store;
        helperDateService.createFromIso.mockImplementation(
            (iso: string) => new Date(iso)
        );
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'auth.xApiKey.keyPattern': 'ApiKey:{key}',
                'auth.xApiKey.cacheTtlInMs': 4000,
                'auth.xApiKey.leaseKeyPattern': 'ApiKey:Lease:{key}',
                'auth.xApiKey.leaseTtlInMs': 10000,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyCache,
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

        cache = module.get(ApiKeyCache);
    });

    describe('getApiKey', () => {
        it('returns the cached api key with dates revived after a JSON round trip', async () => {
            const windowed: ApiKey = {
                ...apiKey,
                startAt: new Date('2026-01-01T00:00:00.000Z'),
                endAt: new Date('2026-02-01T00:00:00.000Z'),
            };
            cacheManager.get.mockResolvedValue(
                JSON.parse(JSON.stringify(windowed))
            );

            const result = await cache.getApiKey('local_abc123');

            expect(result).toEqual(windowed);
            expect(result?.startAt).toBeInstanceOf(Date);
            expect(result?.endAt).toBeInstanceOf(Date);
            expect(result?.createdAt).toBeInstanceOf(Date);
            expect(cacheManager.get).toHaveBeenCalledWith(
                'ApiKey:local_abc123'
            );
        });

        it('keeps absent startAt and endAt null', async () => {
            cacheManager.get.mockResolvedValue(
                JSON.parse(
                    JSON.stringify({
                        ...apiKey,
                        startAt: null,
                        endAt: null,
                    })
                )
            );

            const result = await cache.getApiKey('local_abc123');

            expect(result?.startAt).toBeNull();
            expect(result?.endAt).toBeNull();
        });

        it('returns null on a cache miss', async () => {
            cacheManager.get.mockResolvedValue(undefined);

            const result = await cache.getApiKey('local_abc123');

            expect(result).toBeNull();
        });

        it('returns null when the cache read fails', async () => {
            cacheManager.get.mockRejectedValue(new Error('redis down'));

            const result = await cache.getApiKey('local_abc123');

            expect(result).toBeNull();
            expect(cacheManager.get).toHaveBeenCalledWith(
                'ApiKey:local_abc123'
            );
        });
    });

    describe('takeApiKeyLease', () => {
        it('takes the lease with SET NX PX and returns its random token', async () => {
            helperStringService.random.mockReturnValue('lease-token');
            const client = stubStoreClient({ keyv, store });
            client.set.mockResolvedValue('OK');

            const result = await cache.takeApiKeyLease('local_abc123');

            expect(result).toBe('lease-token');
            expect(store.createKeyPrefix).toHaveBeenCalledWith(
                'ApiKey:Lease:local_abc123',
                'cache'
            );
            expect(client.set).toHaveBeenCalledWith(
                'prefixed-ApiKey:Lease:local_abc123',
                'lease-token',
                { expiration: { type: 'PX', value: 10000 }, condition: 'NX' }
            );
        });

        it('returns null when another reader holds the lease', async () => {
            helperStringService.random.mockReturnValue('lease-token');
            const client = stubStoreClient({ keyv, store });
            client.set.mockResolvedValue(null);

            const result = await cache.takeApiKeyLease('local_abc123');

            expect(result).toBeNull();
        });

        it('returns null when the store fails', async () => {
            helperStringService.random.mockReturnValue('lease-token');
            const client = stubStoreClient({ keyv, store });
            client.set.mockRejectedValue(new Error('redis down'));

            const result = await cache.takeApiKeyLease('local_abc123');

            expect(result).toBeNull();
        });
    });

    describe('setApiKey', () => {
        const windowed: ApiKey = {
            ...apiKey,
            startAt: new Date('2026-01-01T00:00:00.000Z'),
            endAt: new Date('2026-02-01T00:00:00.000Z'),
        };

        it('runs the lease-held set script with the serialized entry, ISO date strings, and the configured ttl', async () => {
            const now = new Date('2026-01-03T00:00:00.000Z');
            helperDateService.create.mockReturnValue(now);
            const client = stubStoreClient({ keyv, store });
            client.eval.mockResolvedValue(1);

            await cache.setApiKey(windowed, 'lease-token');

            expect(keyv.serializeData).toHaveBeenCalledWith({
                value: {
                    ...apiKey,
                    startAt: '2026-01-01T00:00:00.000Z',
                    endAt: '2026-02-01T00:00:00.000Z',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-02T00:00:00.000Z',
                },
                expires: now.getTime() + 4000,
            });
            expect(client.eval).toHaveBeenCalledWith(RedisLeaseSetScript, {
                keys: [
                    'prefixed-ApiKey:local_abc123',
                    'prefixed-ApiKey:Lease:local_abc123',
                ],
                arguments: ['lease-token', 'serialized-value', '4000'],
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
                cache.setApiKey(apiKey, 'lease-token')
            ).resolves.toBeUndefined();
        });
    });

    describe('deleteApiKey', () => {
        it('deletes the cached api key and its lease', async () => {
            await cache.deleteApiKey('local_abc123');

            expect(cacheManager.mdel).toHaveBeenCalledWith([
                'ApiKey:local_abc123',
                'ApiKey:Lease:local_abc123',
            ]);
        });

        it('rethrows a store failure so the admin request fails', async () => {
            const failure = new Error('redis down');
            cacheManager.mdel.mockRejectedValue(failure);

            await expect(cache.deleteApiKey('local_abc123')).rejects.toBe(
                failure
            );
        });
    });
});

import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';

describe('ApiKeyCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

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
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'auth.xApiKey.keyPattern': 'ApiKey:{key}',
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyCache,
                { provide: CacheMainProvider, useValue: cacheManager },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        cache = module.get(ApiKeyCache);
    });

    describe('getCacheByKey', () => {
        it('returns the cached api key', async () => {
            cacheManager.get.mockResolvedValue(apiKey);

            const result = await cache.getCacheByKey('local_abc123');

            expect(result).toEqual(apiKey);
            expect(cacheManager.get).toHaveBeenCalledWith(
                'ApiKey:local_abc123'
            );
        });

        it('returns null on a cache miss', async () => {
            cacheManager.get.mockResolvedValue(undefined);

            const result = await cache.getCacheByKey('local_abc123');

            expect(result).toBeNull();
        });
    });

    describe('setCacheByKey', () => {
        it('writes the api key to the cache', async () => {
            await cache.setCacheByKey('local_abc123', apiKey);

            expect(cacheManager.set).toHaveBeenCalledWith(
                'ApiKey:local_abc123',
                apiKey
            );
        });

        it('swallows a thrown cache write', async () => {
            cacheManager.set.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.setCacheByKey('local_abc123', apiKey)
            ).resolves.toBeUndefined();
        });
    });

    describe('deleteCacheByKey', () => {
        it('deletes the cached api key', async () => {
            await cache.deleteCacheByKey('local_abc123');

            expect(cacheManager.del).toHaveBeenCalledWith(
                'ApiKey:local_abc123'
            );
        });
    });
});

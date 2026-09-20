import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import type { ApiKey } from '@generated/prisma-client';

describe('ApiKeyCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const apiKey = { id: 'api-key-id' } as ApiKey;

    let cache: ApiKeyCache;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue('apikey:{key}');

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyCache,
                { provide: CacheMainProvider, useValue: cacheManager },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        cache = moduleRef.get(ApiKeyCache);
    });

    it('returns the cached record under the pattern-expanded key', async () => {
        cacheManager.get.mockResolvedValue(apiKey);

        await expect(cache.getCacheByKey('abc')).resolves.toBe(apiKey);
        expect(cacheManager.get).toHaveBeenCalledWith('apikey:abc');
    });

    it('returns null on a cache miss', async () => {
        cacheManager.get.mockResolvedValue(undefined);

        await expect(cache.getCacheByKey('abc')).resolves.toBeNull();
    });

    it('stores the record under the pattern-expanded key', async () => {
        await cache.setCacheByKey('abc', apiKey);

        expect(cacheManager.set).toHaveBeenCalledWith('apikey:abc', apiKey);
    });

    it('deletes the pattern-expanded key', async () => {
        await cache.deleteCacheByKey('abc');

        expect(cacheManager.del).toHaveBeenCalledWith('apikey:abc');
    });
});

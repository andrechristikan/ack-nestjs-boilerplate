import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import type { ApiKey } from '@generated/prisma-client';

describe('ApiKeyCache', () => {
    const cacheSet = vi.fn(async (_key: string, _value: unknown) => undefined);
    const cacheGet = vi.fn(async (_key: string): Promise<unknown> => undefined);
    const cacheDel = vi.fn(async (_key: string) => true);
    const cacheManager = {
        async set<T>(key: string, value: T): Promise<T> {
            await cacheSet(key, value);
            return value;
        },
        async get<T>(key: string): Promise<T | undefined> {
            return (await cacheGet(key)) as T | undefined;
        },
        del: cacheDel,
    } satisfies Pick<Cache, 'set' | 'get' | 'del'>;
    const configService = new ConfigService({
        'auth.xApiKey.keyPattern': 'apikey:{key}',
    });
    const apiKey = { id: 'api-key-id' } as ApiKey;

    let cache: ApiKeyCache;

    beforeEach(() => {
        vi.resetAllMocks();
        cache = new ApiKeyCache(
            cacheManager as unknown as Cache,
            configService
        );
    });

    it('returns the cached record under the pattern-expanded key', async () => {
        cacheGet.mockResolvedValue(apiKey);

        await expect(cache.getCacheByKey('abc')).resolves.toBe(apiKey);
        expect(cacheGet).toHaveBeenCalledWith('apikey:abc');
    });

    it('returns null on a cache miss', async () => {
        cacheGet.mockResolvedValue(undefined);

        await expect(cache.getCacheByKey('abc')).resolves.toBeNull();
    });

    it('stores the record under the pattern-expanded key', async () => {
        await cache.setCacheByKey('abc', apiKey);

        expect(cacheSet).toHaveBeenCalledWith('apikey:abc', apiKey);
    });

    it('deletes the pattern-expanded key', async () => {
        await cache.deleteCacheByKey('abc');

        expect(cacheDel).toHaveBeenCalledWith('apikey:abc');
    });
});

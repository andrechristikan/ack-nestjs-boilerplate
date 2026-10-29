import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';

describe('ApiKeyCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

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
        helperDateService.createFromIso.mockImplementation(
            (iso: string) => new Date(iso)
        );
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
                { provide: HelperDateService, useValue: helperDateService },
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
            let stored = '';
            cacheManager.set.mockImplementation(
                async (_key: string, value: unknown) => {
                    stored = JSON.stringify(value);
                    return value;
                }
            );
            await cache.setApiKey(windowed);
            cacheManager.get.mockResolvedValue(JSON.parse(stored));

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

    describe('setApiKey', () => {
        it('writes the api key to the cache with ISO date strings', async () => {
            await cache.setApiKey({
                ...apiKey,
                startAt: new Date('2026-01-01T00:00:00.000Z'),
                endAt: new Date('2026-02-01T00:00:00.000Z'),
            });

            expect(cacheManager.set).toHaveBeenCalledWith(
                'ApiKey:local_abc123',
                {
                    ...apiKey,
                    startAt: '2026-01-01T00:00:00.000Z',
                    endAt: '2026-02-01T00:00:00.000Z',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-02T00:00:00.000Z',
                }
            );
        });

        it('swallows a thrown cache write', async () => {
            cacheManager.set.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(cache.setApiKey(apiKey)).resolves.toBeUndefined();
        });
    });

    describe('deleteApiKey', () => {
        it('deletes the cached api key', async () => {
            await cache.deleteApiKey('local_abc123');

            expect(cacheManager.del).toHaveBeenCalledWith(
                'ApiKey:local_abc123'
            );
        });
    });
});

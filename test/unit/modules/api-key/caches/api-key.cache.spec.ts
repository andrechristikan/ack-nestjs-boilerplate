import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { CacheService } from '@common/cache/services/cache.service';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyCacheSchema } from '@modules/api-key/constants/api-key.constant';

describe('ApiKeyCache', () => {
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let cache: ApiKeyCache;

    beforeEach(async () => {
        vi.resetAllMocks();
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
                { provide: CacheService, useValue: cacheService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        cache = module.get(ApiKeyCache);
    });

    describe('apiKeyTtlInMs', () => {
        it('reads the TTL from auth.xApiKey.cacheTtlInMs', () => {
            expect(cache.apiKeyTtlInMs).toBe(4000);
            expect(configGet).toHaveBeenCalledWith('auth.xApiKey.cacheTtlInMs');
        });
    });

    describe('buildApiKeyKey', () => {
        it('builds the entry key', () => {
            expect(cache.buildApiKeyKey('local_abc123')).toBe(
                'ApiKey:local_abc123'
            );
        });
    });

    describe('buildApiKeyLease', () => {
        it('builds the lease from the lease key pattern and TTL', () => {
            expect(cache.buildApiKeyLease('local_abc123')).toEqual({
                key: 'ApiKey:Lease:local_abc123',
                ttlInMs: 10000,
            });
        });
    });

    describe('buildApiKeyKeys', () => {
        it('returns the entry and lease keys', () => {
            expect(cache.buildApiKeyKeys('local_abc123')).toEqual([
                'ApiKey:local_abc123',
                'ApiKey:Lease:local_abc123',
            ]);
        });
    });

    describe('deleteApiKey', () => {
        it('invalidates the entry and lease keys', async () => {
            await cache.deleteApiKey('local_abc123');

            expect(cacheService.invalidate).toHaveBeenCalledWith([
                'ApiKey:local_abc123',
                'ApiKey:Lease:local_abc123',
            ]);
        });
    });

    describe('ApiKeyCacheSchema', () => {
        it('parses a cached entry with ISO dates into an ApiKey', () => {
            const apiKey: ApiKey = {
                id: 'api-key-1',
                name: 'Acme Api Key',
                type: EnumApiKeyType.default,
                key: 'local_abc123',
                hash: 'hashed-secret',
                isActive: true,
                startAt: null,
                endAt: new Date('2026-02-01T00:00:00.000Z'),
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: 'user-1',
                updatedAt: new Date('2026-01-02T00:00:00.000Z'),
                updatedBy: 'user-1',
            };
            const cached: unknown = {
                ...apiKey,
                endAt: '2026-02-01T00:00:00.000Z',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-02T00:00:00.000Z',
            };

            const result = ApiKeyCacheSchema.parse(cached);

            expect(result).toEqual(apiKey);
            expect(result.endAt).toBeInstanceOf(Date);
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(result.updatedAt).toBeInstanceOf(Date);
        });
    });
});

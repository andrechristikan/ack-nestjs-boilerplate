import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import type { ApiKey } from '@generated/prisma-client/client';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyCacheSchema } from '@modules/api-key/constants/api-key.constant';
import { buildApiKey } from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('ApiKeyCache', () => {
    let configService: MockProxy<ConfigService>;

    let cache: ApiKeyCache;

    beforeEach(async () => {
        configService = buildConfigService({
            'auth.xApiKey.keyPattern': 'ApiKey:{key}',
            'auth.xApiKey.cacheTtlInMs': 4000,
            'auth.xApiKey.leaseKeyPattern': 'ApiKey:Lease:{key}',
            'auth.xApiKey.leaseTtlInMs': 10000,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyCache,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        cache = module.get(ApiKeyCache);
    });

    describe('cacheTtlInMs', () => {
        it('reads the TTL from auth.xApiKey.cacheTtlInMs', () => {
            expect(cache.cacheTtlInMs).toBe(4000);
            expect(configService.get).toHaveBeenCalledWith(
                'auth.xApiKey.cacheTtlInMs'
            );
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

    describe('ApiKeyCacheSchema', () => {
        it('parses a cached entry with ISO dates into an ApiKey', () => {
            const apiKey: ApiKey = {
                ...buildApiKey(),
                endAt: new Date('2026-02-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-02T00:00:00.000Z'),
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

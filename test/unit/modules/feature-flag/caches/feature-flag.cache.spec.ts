import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import type { FeatureFlag } from '@generated/prisma-client/client';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';

describe('FeatureFlagCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

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
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'featureFlag.keyPattern': 'FeatureFlag:{key}',
                'featureFlag.cacheTtlInMs': 3600000,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagCache,
                { provide: CacheMainProvider, useValue: cacheManager },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        cache = module.get(FeatureFlagCache);
    });

    it('reads the key pattern and ttl config once, in the constructor', () => {
        expect(configGet).toHaveBeenCalledWith('featureFlag.keyPattern');
        expect(configGet).toHaveBeenCalledWith('featureFlag.cacheTtlInMs');
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

    describe('setFeatureFlag', () => {
        it('writes the feature flag with the configured ttl', async () => {
            await cache.setFeatureFlag('loginWithGoogle', featureFlag);

            expect(cacheManager.set).toHaveBeenCalledWith(
                'FeatureFlag:loginWithGoogle',
                featureFlag,
                3600000
            );
        });

        it('swallows a thrown store write', async () => {
            cacheManager.set.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.setFeatureFlag('loginWithGoogle', featureFlag)
            ).resolves.toBeUndefined();
        });
    });

    describe('deleteFeatureFlag', () => {
        it('deletes the key built from the key pattern', async () => {
            await cache.deleteFeatureFlag('loginWithGoogle');

            expect(cacheManager.del).toHaveBeenCalledWith(
                'FeatureFlag:loginWithGoogle'
            );
        });

        it('swallows a thrown store delete', async () => {
            cacheManager.del.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.deleteFeatureFlag('loginWithGoogle')
            ).resolves.toBeUndefined();
        });
    });
});

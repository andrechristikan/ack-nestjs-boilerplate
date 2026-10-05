import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import type { FeatureFlag } from '@generated/prisma-client/client';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';

describe('FeatureFlagCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const featureFlagRepository: MockProxy<FeatureFlagRepository> =
        mock<FeatureFlagRepository>();
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
                {
                    provide: FeatureFlagRepository,
                    useValue: featureFlagRepository,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        cache = module.get(FeatureFlagCache);
    });

    it('reads the key pattern and ttl config once, in the constructor', () => {
        expect(configGet).toHaveBeenCalledWith('featureFlag.keyPattern');
        expect(configGet).toHaveBeenCalledWith('featureFlag.cacheTtlInMs');
    });

    describe('getCacheByKey', () => {
        it('returns the cached feature flag built from the key pattern', async () => {
            cacheManager.get.mockResolvedValue(featureFlag);

            const result = await cache.getCacheByKey('loginWithGoogle');

            expect(result).toEqual(featureFlag);
            expect(cacheManager.get).toHaveBeenCalledWith(
                'FeatureFlag:loginWithGoogle'
            );
        });

        it('returns null on a cache miss', async () => {
            cacheManager.get.mockResolvedValue(undefined);

            const result = await cache.getCacheByKey('loginWithGoogle');

            expect(result).toBeNull();
        });

        it('returns null when the store read throws', async () => {
            cacheManager.get.mockImplementation(() => {
                throw new Error('redis down');
            });

            const result = await cache.getCacheByKey('loginWithGoogle');

            expect(result).toBeNull();
        });
    });

    describe('setCacheByKey', () => {
        it('writes the feature flag with the configured ttl', async () => {
            await cache.setCacheByKey('loginWithGoogle', featureFlag);

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
                cache.setCacheByKey('loginWithGoogle', featureFlag)
            ).resolves.toBeUndefined();
        });
    });

    describe('deleteCacheByKey', () => {
        it('deletes the key built from the key pattern', async () => {
            await cache.deleteCacheByKey('loginWithGoogle');

            expect(cacheManager.del).toHaveBeenCalledWith(
                'FeatureFlag:loginWithGoogle'
            );
        });

        it('swallows a thrown store delete', async () => {
            cacheManager.del.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.deleteCacheByKey('loginWithGoogle')
            ).resolves.toBeUndefined();
        });
    });

    describe('getByKeyAndCache', () => {
        it('returns the cached flag without reading the repository', async () => {
            cacheManager.get.mockResolvedValue(featureFlag);

            const result = await cache.getByKeyAndCache('loginWithGoogle');

            expect(result).toEqual(featureFlag);
            expect(featureFlagRepository.findOneByKey).not.toHaveBeenCalled();
        });

        it('loads from the repository and caches it on a cache miss', async () => {
            cacheManager.get.mockResolvedValue(undefined);
            featureFlagRepository.findOneByKey.mockResolvedValue(featureFlag);

            const result = await cache.getByKeyAndCache('loginWithGoogle');

            expect(result).toEqual(featureFlag);
            expect(featureFlagRepository.findOneByKey).toHaveBeenCalledWith(
                'loginWithGoogle'
            );
            expect(cacheManager.set).toHaveBeenCalledWith(
                'FeatureFlag:loginWithGoogle',
                featureFlag,
                3600000
            );
        });

        it('returns null with no cache write when the repository finds nothing', async () => {
            cacheManager.get.mockResolvedValue(undefined);
            featureFlagRepository.findOneByKey.mockResolvedValue(null);

            const result = await cache.getByKeyAndCache('loginWithGoogle');

            expect(result).toBeNull();
            expect(cacheManager.set).not.toHaveBeenCalled();
        });
    });

    describe('getMetadataByKeyAndCache', () => {
        it('returns the metadata of the cached or loaded flag', async () => {
            cacheManager.get.mockResolvedValue(featureFlag);

            const result = await cache.getMetadataByKeyAndCache<{
                newFeature: boolean;
            }>('loginWithGoogle');

            expect(result).toEqual({ newFeature: true });
        });

        it('returns null when no flag is found', async () => {
            cacheManager.get.mockResolvedValue(undefined);
            featureFlagRepository.findOneByKey.mockResolvedValue(null);

            const result =
                await cache.getMetadataByKeyAndCache('loginWithGoogle');

            expect(result).toBeNull();
        });

        it('returns null when the flag carries no metadata', async () => {
            cacheManager.get.mockResolvedValue({
                ...featureFlag,
                metadata: null,
            });

            const result =
                await cache.getMetadataByKeyAndCache('loginWithGoogle');

            expect(result).toBeNull();
        });
    });
});

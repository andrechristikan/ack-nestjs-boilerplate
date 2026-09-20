import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import type { IFeatureFlagWithTargetUsers } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

describe('FeatureFlagCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const featureFlagRepository: MockProxy<FeatureFlagRepository> =
        mock<FeatureFlagRepository>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const featureFlag: IFeatureFlagWithTargetUsers = {
        id: 'flag-id',
        key: 'new-home',
        description: 'New home page',
        isEnable: true,
        rolloutPercent: 50,
        metadata: { enabled: true },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: null,
        targetUsers: [],
    };

    let service: FeatureFlagCache;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation(
            (key: string) =>
                ({
                    'featureFlag.keyPattern': 'feature-flag:{key}',
                    'featureFlag.cacheTtlInMs': 60000,
                })[key]
        );
        const moduleRef: TestingModule = await Test.createTestingModule({
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
        service = moduleRef.get(FeatureFlagCache);
    });

    it('returns a cached flag without loading the repository', async () => {
        cacheManager.get.mockResolvedValue(featureFlag);

        await expect(service.getByKeyAndCache('new-home')).resolves.toBe(
            featureFlag
        );
        expect(featureFlagRepository.findOneByKey).not.toHaveBeenCalled();
    });

    it('loads and caches a flag when the cache is empty', async () => {
        cacheManager.get.mockResolvedValue(null);
        featureFlagRepository.findOneByKey.mockResolvedValue(featureFlag);

        await expect(service.getByKeyAndCache('new-home')).resolves.toBe(
            featureFlag
        );
        expect(cacheManager.set).toHaveBeenCalledWith(
            'feature-flag:new-home',
            featureFlag,
            60000
        );
    });

    it('treats a cache read failure as a cache miss', async () => {
        cacheManager.get.mockRejectedValue(new Error('cache unavailable'));
        featureFlagRepository.findOneByKey.mockResolvedValue(null);

        await expect(service.getByKeyAndCache('new-home')).resolves.toBeNull();
    });
});

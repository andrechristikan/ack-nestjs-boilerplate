import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { IFeatureFlagCacheService } from '@modules/feature-flag/interfaces/feature-flag.cache.service.interface';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlag } from '@generated/prisma-client';
import { Cache } from 'cache-manager';

/** Read-through cache over the feature flag record. */
@Injectable()
export class FeatureFlagCacheService implements IFeatureFlagCacheService {
    private readonly logger = new Logger(FeatureFlagCacheService.name);
    private readonly keyPattern: string;
    private readonly cacheTtlInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        private readonly featureFlagRepository: FeatureFlagRepository,
        private readonly configService: ConfigService
    ) {
        this.keyPattern = this.configService.get<string>(
            'featureFlag.keyPattern'
        )!;
        this.cacheTtlInMs = this.configService.get<number>(
            'featureFlag.cacheTtlInMs'
        )!;
    }

    async getCacheByKey(key: string): Promise<FeatureFlag | null> {
        const cacheKey = this.keyPattern.replace('{key}', key);
        try {
            const cachedFeatureFlag =
                await this.cacheManager.get<FeatureFlag>(cacheKey);
            return cachedFeatureFlag ?? null;
        } catch (error: unknown) {
            this.logger.error(error, 'Feature flag cache read failed');
            return null;
        }
    }

    async setCacheByKey(key: string, featureFlag: FeatureFlag): Promise<void> {
        const cacheKey = this.keyPattern.replace('{key}', key);
        try {
            await this.cacheManager.set(
                cacheKey,
                featureFlag,
                this.cacheTtlInMs
            );
        } catch (error: unknown) {
            this.logger.error(error, 'Feature flag cache write failed');
        }
    }

    async deleteCacheByKey(key: string): Promise<void> {
        const cacheKey = this.keyPattern.replace('{key}', key);
        try {
            await this.cacheManager.del(cacheKey);
        } catch (error: unknown) {
            this.logger.error(error, 'Feature flag cache delete failed');
        }
    }

    /** Read-through cache: returns the cached flag or loads from the repository and caches it. */
    async getByKeyAndCache(key: string): Promise<FeatureFlag | null> {
        const cached = await this.getCacheByKey(key);
        if (cached) {
            return cached;
        }

        const featureFlag = await this.featureFlagRepository.findOneByKey(key);
        if (featureFlag) {
            await this.setCacheByKey(key, featureFlag);
        }

        return featureFlag;
    }

    async getMetadataByKeyAndCache<T>(key: string): Promise<T | null> {
        const cached = await this.getByKeyAndCache(key);
        if (cached && cached.metadata) {
            return cached.metadata as T;
        }

        return null;
    }
}

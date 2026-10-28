import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FeatureFlag } from '@generated/prisma-client/client';
import type { Cache } from 'cache-manager';

/** Reads and writes the cached feature flag record; every failure logs and falls through. */
@Injectable()
export class FeatureFlagCache {
    private readonly logger = new Logger(FeatureFlagCache.name);
    private readonly featureFlagKeyPattern: string;
    private readonly featureFlagTtlInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        private readonly configService: ConfigService
    ) {
        this.featureFlagKeyPattern = this.configService.get<string>(
            'featureFlag.keyPattern'
        )!;
        this.featureFlagTtlInMs = this.configService.get<number>(
            'featureFlag.cacheTtlInMs'
        )!;
    }

    private buildFeatureFlagKey(key: string): string {
        return this.featureFlagKeyPattern.replace('{key}', () => key);
    }

    async getFeatureFlag(key: string): Promise<FeatureFlag | null> {
        const cacheKey = this.buildFeatureFlagKey(key);
        try {
            const cached = await this.cacheManager.get<FeatureFlag>(cacheKey);

            return cached ?? null;
        } catch (error: unknown) {
            this.logger.error(error, 'Feature flag cache read failed');

            return null;
        }
    }

    async setFeatureFlag(key: string, featureFlag: FeatureFlag): Promise<void> {
        const cacheKey = this.buildFeatureFlagKey(key);
        try {
            await this.cacheManager.set(
                cacheKey,
                featureFlag,
                this.featureFlagTtlInMs
            );
        } catch (error: unknown) {
            this.logger.error(error, 'Feature flag cache write failed');
        }
    }

    async deleteFeatureFlag(key: string): Promise<void> {
        const cacheKey = this.buildFeatureFlagKey(key);
        try {
            await this.cacheManager.del(cacheKey);
        } catch (error: unknown) {
            this.logger.error(error, 'Feature flag cache delete failed');
        }
    }
}

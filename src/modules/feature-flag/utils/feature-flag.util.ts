import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperService } from '@common/helper/services/helper.service';
import { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response';
import { IFeatureFlagMetadata } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlag } from '@generated/prisma-client';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class FeatureFlagUtil {
    private readonly cachePrefixKey: string;
    private readonly cacheTtlMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        private readonly featureFlagRepository: FeatureFlagRepository,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.cachePrefixKey = this.configService.get<string>(
            'featureFlag.cachePrefixKey'
        );
        this.cacheTtlMs = this.configService.get<number>(
            'featureFlag.cacheTtlMs'
        );
    }

    async getCacheByKey(key: string): Promise<FeatureFlag | null> {
        const cacheKey = `${this.cachePrefixKey}:${key}`;
        const cachedFeatureFlag =
            await this.cacheManager.get<FeatureFlag>(cacheKey);
        if (cachedFeatureFlag) {
            return cachedFeatureFlag;
        }

        return null;
    }

    async setCacheByKey(key: string, featureFlag: FeatureFlag): Promise<void> {
        const cacheKey = `${this.cachePrefixKey}:${key}`;
        await this.cacheManager.set(cacheKey, featureFlag, this.cacheTtlMs);

        return;
    }

    async deleteCacheByKey(key: string): Promise<void> {
        const cacheKey = `${this.cachePrefixKey}:${key}`;
        await this.cacheManager.del(cacheKey);

        return;
    }

    mapList(featureFlags: FeatureFlag[]): FeatureFlagResponseDto[] {
        return plainToInstance(FeatureFlagResponseDto, featureFlags);
    }

    mapOne(featureFlag: FeatureFlag): FeatureFlagResponseDto {
        return plainToInstance(FeatureFlagResponseDto, featureFlag);
    }

    checkMetadataKey(
        oldMetadata: IFeatureFlagMetadata,
        newMetadata: IFeatureFlagMetadata
    ): boolean {
        const oldKeys = Object.keys(oldMetadata).sort();
        const newKeys = Object.keys(newMetadata).sort();

        const isValidStructure =
            JSON.stringify(oldKeys) === JSON.stringify(newKeys);
        if (!isValidStructure) {
            return false;
        }

        for (const key of newKeys) {
            const newVal = newMetadata[key];
            const oldVal = oldMetadata[key];

            if (typeof newVal !== typeof oldVal) {
                return false;
            } else if (
                newVal === undefined ||
                newVal === null ||
                newVal === ''
            ) {
                return false;
            }
        }

        return true;
    }

    checkRolloutPercentage(
        rolloutPercent: number,
        identifier: string
    ): boolean {
        const hash = this.helperService.md5Hash(identifier);
        const num = Number.parseInt(hash.slice(0, 8), 16);
        const percentage = num % 100;

        return percentage < rolloutPercent;
    }

    async getByKeyAndCache(key: string): Promise<FeatureFlag | null> {
        const cached = await this.getCacheByKey(key);
        if (cached) {
            return cached;
        }

        const apiKey = await this.featureFlagRepository.findOneByKey(key);
        if (apiKey) {
            await this.setCacheByKey(key, apiKey);
        }

        return apiKey;
    }

    async getMetadataByKeyAndCache<T>(key: string): Promise<T | null> {
        const cached = await this.getByKeyAndCache(key);
        if (cached && cached.metadata) {
            return cached.metadata as T;
        }

        return null;
    }
}

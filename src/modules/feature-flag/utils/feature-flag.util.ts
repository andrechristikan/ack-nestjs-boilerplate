import { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response';
import { IFeatureFlagValue } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlag } from '@prisma/client';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class FeatureFlagUtil {
    private readonly cachePrefixKey: string;
    private readonly cacheTtlMs: number;

    constructor(
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        private readonly configService: ConfigService
    ) {
        this.cachePrefixKey = this.configService.get<string>(
            'setting.cachePrefixKey'
        );
        this.cacheTtlMs = this.configService.get<number>(
            'setting.cacheTtlSeconds'
        );
    }

    async getCacheByKey(key: string): Promise<FeatureFlag | null> {
        const cacheKey = `${this.cachePrefixKey}:${key}`;
        const cachedFeatureFlag = await this.cacheManager.get<string>(cacheKey);
        if (cachedFeatureFlag) {
            return JSON.parse(cachedFeatureFlag) as FeatureFlag;
        }

        return null;
    }

    async setCacheByKey(key: string, apiKey: FeatureFlag): Promise<void> {
        const cacheKey = `${this.cachePrefixKey}:${key}`;
        await this.cacheManager.set(
            cacheKey,
            JSON.stringify(apiKey),
            this.cacheTtlMs
        );

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

    checkValueKey(
        oldValue: IFeatureFlagValue,
        newValue: IFeatureFlagValue
    ): boolean {
        const oldKeys = Object.keys(oldValue).sort();
        const newKeys = Object.keys(newValue).sort();

        const isValidStructure =
            JSON.stringify(oldKeys) === JSON.stringify(newKeys);
        if (!isValidStructure) {
            return false;
        }

        for (const key of newKeys) {
            const val = newValue[key];

            if (
                typeof val !== 'string' &&
                typeof val !== 'number' &&
                typeof val !== 'boolean'
            ) {
                return false;
            }
        }

        return true;
    }
}

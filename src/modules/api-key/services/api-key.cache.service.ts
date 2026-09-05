import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { ApiKey } from '@generated/prisma-client';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { IApiKeyCacheService } from '@modules/api-key/interfaces/api-key.cache.service.interface';

/** Reads and writes the cached API key record. */
@Injectable()
export class ApiKeyCacheService implements IApiKeyCacheService {
    private readonly keyPattern: string;

    constructor(
        @Inject(CacheMainProvider) private cacheManager: Cache,
        private readonly configService: ConfigService
    ) {
        this.keyPattern = this.configService.get<string>(
            'auth.xApiKey.keyPattern'
        )!;
    }

    async getCacheByKey(key: string): Promise<ApiKey | null> {
        const cacheKey = this.keyPattern.replace('{key}', key);
        const cachedApiKey = await this.cacheManager.get<ApiKey>(cacheKey);
        if (cachedApiKey) {
            return cachedApiKey;
        }

        return null;
    }

    async setCacheByKey(key: string, apiKey: ApiKey): Promise<void> {
        const cacheKey = this.keyPattern.replace('{key}', key);
        await this.cacheManager.set(cacheKey, apiKey);
        return;
    }

    async deleteCacheByKey(key: string): Promise<void> {
        const cacheKey = this.keyPattern.replace('{key}', key);
        await this.cacheManager.del(cacheKey);
        return;
    }
}

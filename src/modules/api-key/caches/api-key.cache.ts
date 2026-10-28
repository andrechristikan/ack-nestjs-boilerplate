import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import type { ApiKey } from '@generated/prisma-client/client';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';

/** Reads and writes the cached API key record. */
@Injectable()
export class ApiKeyCache {
    private readonly logger = new Logger(ApiKeyCache.name);
    private readonly apiKeyKeyPattern: string;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        private readonly configService: ConfigService
    ) {
        this.apiKeyKeyPattern = this.configService.get<string>(
            'auth.xApiKey.keyPattern'
        )!;
    }

    private buildApiKeyKey(key: string): string {
        return this.apiKeyKeyPattern.replace('{key}', () => key);
    }

    async getApiKey(key: string): Promise<ApiKey | null> {
        const cacheKey = this.buildApiKeyKey(key);
        try {
            const cached = await this.cacheManager.get<ApiKey>(cacheKey);

            return cached ?? null;
        } catch (error: unknown) {
            this.logger.error(error, 'API key cache read failed');

            return null;
        }
    }

    async setApiKey(key: string, apiKey: ApiKey): Promise<void> {
        const cacheKey = this.buildApiKeyKey(key);
        try {
            await this.cacheManager.set(cacheKey, apiKey);
        } catch (error: unknown) {
            this.logger.error(error, 'API key cache write failed');
        }
    }

    async deleteApiKey(key: string): Promise<void> {
        const cacheKey = this.buildApiKeyKey(key);
        await this.cacheManager.del(cacheKey);
    }
}

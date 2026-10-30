import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import type { ApiKey } from '@generated/prisma-client/client';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IApiKeyCache } from '@modules/api-key/interfaces/api-key.interface';

/** Reads and writes the cached API key record. */
@Injectable()
export class ApiKeyCache {
    private readonly logger = new Logger(ApiKeyCache.name);
    private readonly apiKeyKeyPattern: string;
    private readonly apiKeyTtlInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
        this.apiKeyKeyPattern = this.configService.get<string>(
            'auth.xApiKey.keyPattern'
        )!;
        this.apiKeyTtlInMs = this.configService.get<number>(
            'auth.xApiKey.cacheTtlInMs'
        )!;
    }

    private buildApiKeyKey(key: string): string {
        return this.apiKeyKeyPattern.replace('{key}', () => key);
    }

    private reviveDate(iso: string | null): Date | null {
        if (iso === null) {
            return null;
        }

        return this.helperDateService.createFromIso(iso);
    }

    async getApiKey(key: string): Promise<ApiKey | null> {
        const cacheKey = this.buildApiKeyKey(key);
        try {
            const cached = await this.cacheManager.get<IApiKeyCache>(cacheKey);
            if (!cached) {
                return null;
            }

            const startAt = this.reviveDate(cached.startAt);
            const endAt = this.reviveDate(cached.endAt);
            const createdAt = this.helperDateService.createFromIso(
                cached.createdAt
            );
            const updatedAt = this.helperDateService.createFromIso(
                cached.updatedAt
            );

            return { ...cached, startAt, endAt, createdAt, updatedAt };
        } catch (error: unknown) {
            this.logger.error(error, 'API key cache read failed');

            return null;
        }
    }

    async setApiKey(apiKey: ApiKey): Promise<void> {
        const cacheKey = this.buildApiKeyKey(apiKey.key);
        const cached: IApiKeyCache = {
            ...apiKey,
            startAt: apiKey.startAt?.toISOString() ?? null,
            endAt: apiKey.endAt?.toISOString() ?? null,
            createdAt: apiKey.createdAt.toISOString(),
            updatedAt: apiKey.updatedAt.toISOString(),
        };
        try {
            await this.cacheManager.set(cacheKey, cached, this.apiKeyTtlInMs);
        } catch (error: unknown) {
            this.logger.error(error, 'API key cache write failed');
        }
    }

    async deleteApiKey(key: string): Promise<void> {
        const cacheKey = this.buildApiKeyKey(key);
        await this.cacheManager.del(cacheKey);
    }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import type KeyvRedis from '@keyv/redis';
import type Keyv from 'keyv';
import type { ApiKey } from '@generated/prisma-client/client';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    RedisClientCachedProvider,
    RedisLeaseSetScript,
} from '@common/redis/constants/redis.constant';
import type { IApiKeyCache } from '@modules/api-key/interfaces/api-key.interface';

/** Reads and writes the cached API key record, a read-through entry guarded by a lease. */
@Injectable()
export class ApiKeyCache {
    private readonly logger = new Logger(ApiKeyCache.name);
    private readonly apiKeyKeyPattern: string;
    private readonly apiKeyTtlInMs: number;
    private readonly apiKeyLeaseKeyPattern: string;
    private readonly apiKeyLeaseTtlInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        @Inject(RedisClientCachedProvider) private readonly keyv: Keyv,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService
    ) {
        this.apiKeyKeyPattern = this.configService.get<string>(
            'auth.xApiKey.keyPattern'
        )!;
        this.apiKeyTtlInMs = this.configService.get<number>(
            'auth.xApiKey.cacheTtlInMs'
        )!;
        this.apiKeyLeaseKeyPattern = this.configService.get<string>(
            'auth.xApiKey.leaseKeyPattern'
        )!;
        this.apiKeyLeaseTtlInMs = this.configService.get<number>(
            'auth.xApiKey.leaseTtlInMs'
        )!;
    }

    private buildApiKeyKey(key: string): string {
        return this.apiKeyKeyPattern.replace('{key}', () => key);
    }

    private buildApiKeyLeaseKey(key: string): string {
        return this.apiKeyLeaseKeyPattern.replace('{key}', () => key);
    }

    private getStore(): KeyvRedis<string> {
        return this.keyv.store as KeyvRedis<string>;
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

    /** Takes the read-through lease of a key with SET NX PX; the token, or null when another reader holds the lease or the store fails. */
    async takeApiKeyLease(key: string): Promise<string | null> {
        const token = this.helperStringService.random(32);
        try {
            const store = this.getStore();
            const leaseCacheKey = this.buildApiKeyLeaseKey(key);
            const leaseKey = store.createKeyPrefix(
                leaseCacheKey,
                store.namespace
            );
            const client = await store.getClient();
            const reply = await client.set(leaseKey, token, {
                expiration: { type: 'PX', value: this.apiKeyLeaseTtlInMs },
                condition: 'NX',
            });

            return reply === 'OK' ? token : null;
        } catch (error: unknown) {
            this.logger.error(error, 'API key cache lease take failed');

            return null;
        }
    }

    /** Writes the entry and drops the lease in one script, only while the lease still holds the token. */
    async setApiKey(apiKey: ApiKey, leaseToken: string): Promise<void> {
        const cached: IApiKeyCache = {
            ...apiKey,
            startAt: apiKey.startAt?.toISOString() ?? null,
            endAt: apiKey.endAt?.toISOString() ?? null,
            createdAt: apiKey.createdAt.toISOString(),
            updatedAt: apiKey.updatedAt.toISOString(),
        };
        try {
            const store = this.getStore();
            const entryCacheKey = this.buildApiKeyKey(apiKey.key);
            const leaseCacheKey = this.buildApiKeyLeaseKey(apiKey.key);
            const entryKey = store.createKeyPrefix(
                entryCacheKey,
                store.namespace
            );
            const leaseKey = store.createKeyPrefix(
                leaseCacheKey,
                store.namespace
            );
            const now = this.helperDateService.create();
            const [value, client] = await Promise.all([
                this.keyv.serializeData<IApiKeyCache>({
                    value: cached,
                    expires: now.getTime() + this.apiKeyTtlInMs,
                }),
                store.getClient(),
            ]);
            await client.eval(RedisLeaseSetScript, {
                keys: [entryKey, leaseKey],
                arguments: [
                    leaseToken,
                    value as string,
                    `${this.apiKeyTtlInMs}`,
                ],
            });
        } catch (error: unknown) {
            this.logger.error(error, 'API key cache write failed');
        }
    }

    /** Deletes the entry and its lease; a store failure throws so a stale entry never outlives the committed write. */
    async deleteApiKey(key: string): Promise<void> {
        await this.cacheManager.mdel([
            this.buildApiKeyKey(key),
            this.buildApiKeyLeaseKey(key),
        ]);
    }
}

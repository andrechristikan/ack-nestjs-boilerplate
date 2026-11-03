import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    RedisClientCachedProvider,
    RedisLeaseSetScript,
} from '@common/redis/constants/redis.constant';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FeatureFlag } from '@generated/prisma-client/client';
import type KeyvRedis from '@keyv/redis';
import type { Cache } from 'cache-manager';
import type Keyv from 'keyv';

/** Reads and writes the cached feature flag record, a read-through entry guarded by a lease; a read, lease take, or set failure logs and falls through, a delete failure throws. */
@Injectable()
export class FeatureFlagCache {
    private readonly logger = new Logger(FeatureFlagCache.name);
    private readonly featureFlagKeyPattern: string;
    private readonly featureFlagTtlInMs: number;
    private readonly featureFlagLeaseKeyPattern: string;
    private readonly featureFlagLeaseTtlInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        @Inject(RedisClientCachedProvider) private readonly keyv: Keyv,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService
    ) {
        this.featureFlagKeyPattern = this.configService.get<string>(
            'featureFlag.keyPattern'
        )!;
        this.featureFlagTtlInMs = this.configService.get<number>(
            'featureFlag.cacheTtlInMs'
        )!;
        this.featureFlagLeaseKeyPattern = this.configService.get<string>(
            'featureFlag.leaseKeyPattern'
        )!;
        this.featureFlagLeaseTtlInMs = this.configService.get<number>(
            'featureFlag.leaseTtlInMs'
        )!;
    }

    private buildFeatureFlagKey(key: string): string {
        return this.featureFlagKeyPattern.replace('{key}', () => key);
    }

    private buildFeatureFlagLeaseKey(key: string): string {
        return this.featureFlagLeaseKeyPattern.replace('{key}', () => key);
    }

    private getStore(): KeyvRedis<string> {
        return this.keyv.store as KeyvRedis<string>;
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

    /** Takes the read-through lease of a key with SET NX PX; the token, or null when another reader holds the lease or the store fails. */
    async takeFeatureFlagLease(key: string): Promise<string | null> {
        const token = this.helperStringService.random(32);
        try {
            const store = this.getStore();
            const leaseCacheKey = this.buildFeatureFlagLeaseKey(key);
            const leaseKey = store.createKeyPrefix(
                leaseCacheKey,
                store.namespace
            );
            const client = await store.getClient();
            const reply = await client.set(leaseKey, token, {
                expiration: {
                    type: 'PX',
                    value: this.featureFlagLeaseTtlInMs,
                },
                condition: 'NX',
            });

            return reply === 'OK' ? token : null;
        } catch (error: unknown) {
            this.logger.error(error, 'Feature flag cache lease take failed');

            return null;
        }
    }

    /** Writes the entry and drops the lease in one script, only while the lease still holds the token. */
    async setFeatureFlag(
        key: string,
        featureFlag: FeatureFlag,
        leaseToken: string
    ): Promise<void> {
        try {
            const store = this.getStore();
            const entryCacheKey = this.buildFeatureFlagKey(key);
            const leaseCacheKey = this.buildFeatureFlagLeaseKey(key);
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
                this.keyv.serializeData<FeatureFlag>({
                    value: featureFlag,
                    expires: now.getTime() + this.featureFlagTtlInMs,
                }),
                store.getClient(),
            ]);
            await client.eval(RedisLeaseSetScript, {
                keys: [entryKey, leaseKey],
                arguments: [
                    leaseToken,
                    value as string,
                    `${this.featureFlagTtlInMs}`,
                ],
            });
        } catch (error: unknown) {
            this.logger.error(error, 'Feature flag cache write failed');
        }
    }

    /** Deletes the entry and its lease; a store failure throws so a stale entry never outlives the committed write. */
    async deleteFeatureFlag(key: string): Promise<void> {
        await this.cacheManager.mdel([
            this.buildFeatureFlagKey(key),
            this.buildFeatureFlagLeaseKey(key),
        ]);
    }
}

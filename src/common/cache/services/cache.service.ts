import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type KeyvRedis from '@keyv/redis';
import { RedisErrorMessages } from '@keyv/redis';
import {
    ClientClosedError,
    ClientOfflineError,
    ConnectionTimeoutError,
    SocketClosedUnexpectedlyError,
    TimeoutError,
} from '@redis/client';
import type Keyv from 'keyv';
import type { ZodType } from 'zod';
import { CacheLeaseSetScript } from '@common/cache/constants/cache.constant';
import type {
    ICacheLease,
    ICacheReadThroughOptions,
} from '@common/cache/interfaces/cache.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);
    private readonly warnWindowInMs: number;
    private readonly warnedAtByKey: Map<string, number> = new Map();

    constructor(
        @Inject(RedisClientCachedProvider) private readonly keyv: Keyv,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService
    ) {
        this.warnWindowInMs = this.configService.get<number>(
            'redis.warnWindowInMs'
        )!;
    }

    private getStore(): KeyvRedis<string> {
        return this.keyv.store as KeyvRedis<string>;
    }

    private async readEntry<T>(
        key: string,
        schema: ZodType<T>
    ): Promise<T | null> {
        try {
            const stored = await this.keyv.get<unknown>(key);
            const cached = stored ?? null;
            if (cached === null) {
                return null;
            }

            const parsed = schema.safeParse(cached);
            if (parsed.success) {
                return parsed.data;
            }

            this.warnOnce(key, parsed.error, 'Cache entry failed its schema');
            await this.keyv.delete(key);

            return null;
        } catch (error: unknown) {
            this.handleError(key, error, 'Cache read failed');

            return null;
        }
    }

    private async writeEntry<T>(
        key: string,
        value: T,
        ttlInMs: number
    ): Promise<void> {
        try {
            await this.keyv.set(key, value, ttlInMs);
        } catch (error: unknown) {
            this.handleError(key, error, 'Cache write failed');
        }
    }

    private async takeLease(
        key: string,
        lease: ICacheLease
    ): Promise<string | null> {
        const token = this.helperStringService.random(32);
        const store = this.getStore();
        const leaseKey = store.createKeyPrefix(lease.key, store.namespace);
        try {
            const client = await store.getClient();
            const reply = await client.set(leaseKey, token, {
                expiration: { type: 'PX', value: lease.ttlInMs },
                condition: 'NX',
            });

            return reply === 'OK' ? token : null;
        } catch (error: unknown) {
            this.handleError(key, error, 'Cache lease take failed');

            return null;
        }
    }

    private async writeLeasedEntry<T>(
        key: string,
        value: T,
        ttlInMs: number,
        lease: ICacheLease,
        token: string
    ): Promise<void> {
        const store = this.getStore();
        const entryKey = store.createKeyPrefix(key, store.namespace);
        const leaseKey = store.createKeyPrefix(lease.key, store.namespace);
        const now = this.helperDateService.create();
        try {
            const [serialized, client] = await Promise.all([
                this.keyv.serializeData<T>({
                    value,
                    expires: now.getTime() + ttlInMs,
                }),
                store.getClient(),
            ]);
            await client.eval(CacheLeaseSetScript, {
                keys: [entryKey, leaseKey],
                arguments: [token, serialized as string, `${ttlInMs}`],
            });
        } catch (error: unknown) {
            this.handleError(key, error, 'Cache write failed');
        }
    }

    private handleError(key: string, error: unknown, message: string): void {
        const isConnection = this.isConnectionError(error);
        if (isConnection) {
            throw new RedisUnavailableException(error);
        }

        this.warnOnce(key, error, message);
    }

    /** The cached value when it passes the schema, else the loader's result, stored best-effort unless null; a connection error throws RedisUnavailableException. */
    async readThrough<T, TLoaded extends T | null>(
        key: string,
        schema: ZodType<T>,
        ttlInMs: number,
        loader: () => Promise<TLoaded>,
        options?: ICacheReadThroughOptions
    ): Promise<T | TLoaded> {
        const cached = await this.readEntry(key, schema);
        if (cached !== null) {
            return cached;
        }

        const lease = options?.lease ?? null;
        if (lease === null) {
            const value = await loader();
            if (value !== null) {
                await this.writeEntry(key, value, ttlInMs);
            }

            return value;
        }

        // Sequential by design: side effects whose order is part of the contract (the lease is taken before the read it guards)
        const token = await this.takeLease(key, lease);
        const value = await loader();
        if (value !== null && token !== null) {
            await this.writeLeasedEntry(key, value, ttlInMs, lease, token);
        }

        return value;
    }

    /** Deletes the keys; a connection error throws RedisUnavailableException, any other error logs one warn. */
    async invalidate(keys: string[]): Promise<void> {
        try {
            await this.keyv.deleteMany(keys);
        } catch (error: unknown) {
            const warnKey = keys.join(',');
            this.handleError(warnKey, error, 'Cache invalidation failed');
        }
    }

    isConnectionError(error: unknown): boolean {
        return (
            error instanceof ClientOfflineError ||
            error instanceof ClientClosedError ||
            error instanceof ConnectionTimeoutError ||
            error instanceof SocketClosedUnexpectedlyError ||
            error instanceof TimeoutError ||
            (error instanceof Error &&
                error.message ===
                    RedisErrorMessages.RedisClientNotConnectedThrown)
        );
    }

    /** Logs the error at warn at most once per key per redis.warnWindowInMs. */
    warnOnce(key: string, error: unknown, message: string): void {
        const isFirst = this.isFirstInWindow(key);
        if (isFirst) {
            this.logger.warn({ key, err: error }, message);
        }
    }

    /** True at most once per key per redis.warnWindowInMs; records the key. */
    isFirstInWindow(key: string): boolean {
        const date = this.helperDateService.create();
        const now = date.getTime();
        const windowStart = now - this.warnWindowInMs;
        for (const [recordedKey, recordedAt] of this.warnedAtByKey) {
            if (recordedAt <= windowStart) {
                this.warnedAtByKey.delete(recordedKey);
            }
        }

        const isRecorded = this.warnedAtByKey.has(key);
        if (isRecorded) {
            return false;
        }

        this.warnedAtByKey.set(key, now);

        return true;
    }
}

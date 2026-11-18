import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import type { ZodType } from 'zod';
import {
    EnumCacheProcess,
    EnumCacheQueue,
} from '@common/cache/enums/cache.enum';
import type {
    ICacheInvalidateEffect,
    ICacheLease,
    ICacheReadThroughOptions,
} from '@common/cache/interfaces/cache.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    RedisCacheClient,
    RedisConnectionErrorCodes,
    RedisConnectionErrorMessages,
    RedisConnectionErrorNames,
} from '@common/redis/constants/redis.constant';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);
    private readonly warnWindowInMs: number;
    private readonly warnedAtByKey: Map<string, number> = new Map();

    constructor(
        @Inject(RedisCacheClient) private readonly redis: Redis,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService
    ) {
        this.warnWindowInMs = this.configService.get<number>(
            'redis.warnWindowInMs'
        )!;
    }

    private async readEntry<T>(
        key: string,
        schema: ZodType<T>
    ): Promise<T | null> {
        try {
            const cached = await this.redis.get(key);
            if (cached === null) {
                return null;
            }

            const parsed = schema.safeParse(JSON.parse(cached));
            if (parsed.success) {
                return parsed.data;
            }

            this.warnOnce(key, parsed.error, 'Cache entry failed its schema');
            await this.redis.unlink(key);

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
            await this.redis.set(key, JSON.stringify(value), 'PX', ttlInMs);
        } catch (error: unknown) {
            this.handleError(key, error, 'Cache write failed');
        }
    }

    private async takeLease(
        key: string,
        lease: ICacheLease
    ): Promise<string | null> {
        const token = this.helperStringService.random(32);
        try {
            const reply = await this.redis.set(
                lease.key,
                token,
                'PX',
                lease.ttlInMs,
                'NX'
            );

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
        const script = `
            if redis.call('GET', KEYS[2]) ~= ARGV[1] then
                return 0
            end
            redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
            redis.call('DEL', KEYS[2])
            return 1
        `;

        try {
            await this.redis.eval(
                script,
                2,
                key,
                lease.key,
                token,
                JSON.stringify(value),
                `${ttlInMs}`
            );
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
        if (keys.length === 0) {
            return;
        }

        try {
            await this.redis.unlink(...keys);
        } catch (error: unknown) {
            const warnKey = keys.join(',');
            this.handleError(warnKey, error, 'Cache invalidation failed');
        }
    }

    /** Empties the cache connection's database; a connection error throws RedisUnavailableException, any other error logs one warn. */
    async flush(): Promise<void> {
        try {
            await this.redis.flushdb();
        } catch (error: unknown) {
            this.handleError('flushdb', error, 'Cache flush failed');
        }
    }

    /** The outbox effect that deletes the keys through the cache queue. */
    invalidateEffect(keys: string[]): ICacheInvalidateEffect {
        return {
            queue: EnumCacheQueue.cache,
            name: EnumCacheProcess.invalidate,
            data: { keys },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };
    }

    isConnectionError(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        return (
            RedisConnectionErrorMessages.includes(error.message) ||
            RedisConnectionErrorNames.includes(error.name) ||
            ('code' in error &&
                typeof error.code === 'string' &&
                RedisConnectionErrorCodes.includes(error.code))
        );
    }

    /** Logs the error at warn at most once per key per redis.warnWindowInMs. */
    warnOnce(key: string, error: unknown, message: string): void {
        const isFirst = this.isFirstInWindow(key);
        if (isFirst) {
            this.logger.warn({ key, err: error }, message);
        }
    }

    /** True at most once per key per redis.warnWindowInMs; a true call records the key. */
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

import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { ZodType } from 'zod';
import type {
    ICacheLease,
    ICacheReadThroughOptions,
} from '@common/cache/interfaces/cache.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RedisCacheClient } from '@common/redis/constants/redis.constant';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);

    constructor(
        @Inject(RedisCacheClient) private readonly redis: Redis,
        private readonly helperStringService: HelperStringService
    ) {}

    private async readEntry<T>(
        key: string,
        schema: ZodType<T>
    ): Promise<T | null> {
        let cached: string | null;
        try {
            cached = await this.redis.get(key);
        } catch (error: unknown) {
            throw new RedisUnavailableException(error);
        }

        if (cached === null) {
            return null;
        }

        let failure: unknown;
        try {
            const parsed = schema.safeParse(JSON.parse(cached));
            if (parsed.success) {
                return parsed.data;
            }

            failure = parsed.error;
        } catch (error: unknown) {
            failure = error;
        }

        this.logger.warn(
            { key, err: failure },
            'Cache entry failed its schema'
        );
        try {
            await this.redis.unlink(key);
        } catch (error: unknown) {
            throw new RedisUnavailableException(error);
        }

        return null;
    }

    private async writeEntry<T>(
        key: string,
        value: T,
        ttlInMs: number
    ): Promise<void> {
        try {
            await this.redis.set(key, JSON.stringify(value), 'PX', ttlInMs);
        } catch (error: unknown) {
            throw new RedisUnavailableException(error);
        }
    }

    private async takeLease(lease: ICacheLease): Promise<string | null> {
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
            throw new RedisUnavailableException(error);
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
            throw new RedisUnavailableException(error);
        }
    }

    /** The cached value when it passes the schema, else the loader's result, stored unless it is null or another reader holds the lease; any Redis error throws RedisUnavailableException. */
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
        const token = await this.takeLease(lease);
        const value = await loader();
        if (value !== null && token !== null) {
            await this.writeLeasedEntry(key, value, ttlInMs, lease, token);
        }

        return value;
    }

    /** Deletes the keys; any Redis error throws RedisUnavailableException. */
    async invalidate(keys: string[]): Promise<void> {
        if (keys.length === 0) {
            return;
        }

        try {
            await this.redis.unlink(...keys);
        } catch (error: unknown) {
            throw new RedisUnavailableException(error);
        }
    }

    /** Empties the cache connection's database; any Redis error throws RedisUnavailableException. */
    async flush(): Promise<void> {
        try {
            await this.redis.flushdb();
        } catch (error: unknown) {
            throw new RedisUnavailableException(error);
        }
    }
}

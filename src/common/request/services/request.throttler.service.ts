import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Keyv from 'keyv';
import KeyvRedis, { RedisClientConnectionType } from '@keyv/redis';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';

@Injectable()
export class RequestThrottlerStorageService implements ThrottlerStorage {
    private readonly keyPattern: string;
    private readonly blockKeyPattern: string;
    private readonly sequenceKeyPattern: string;
    private readonly logger = new Logger(RequestThrottlerStorageService.name);

    constructor(
        @Inject(RedisClientCachedProvider) private readonly keyv: Keyv,
        private readonly configService: ConfigService
    ) {
        this.keyPattern = this.configService.get<string>(
            'request.throttle.keyPattern'
        )!;
        this.blockKeyPattern = this.configService.get<string>(
            'request.throttle.blockKeyPattern'
        )!;
        this.sequenceKeyPattern = this.configService.get<string>(
            'request.throttle.sequenceKeyPattern'
        )!;
    }

    private buildKey(
        pattern: string,
        throttlerName: string,
        tracker: string
    ): string {
        return pattern
            .replace('{name}', throttlerName)
            .replace('{tracker}', tracker);
    }

    private async getClient(): Promise<RedisClientConnectionType> {
        const store = this.keyv.store as KeyvRedis<string>;
        return store.getClient();
    }

    private failOpenRecord(): ThrottlerStorageRecord {
        return {
            totalHits: 0,
            timeToExpire: 0,
            isBlocked: false,
            timeToBlockExpire: 0,
        };
    }

    private toSeconds(milliseconds: number): number {
        return milliseconds > 0 ? Math.ceil(milliseconds / 1000) : 0;
    }

    async increment(
        key: string,
        ttl: number,
        limit: number,
        blockDuration: number,
        throttlerName: string
    ): Promise<ThrottlerStorageRecord> {
        const redisKey = this.buildKey(this.keyPattern, throttlerName, key);
        const blockKey = this.buildKey(
            this.blockKeyPattern,
            throttlerName,
            key
        );
        const sequenceKey = this.buildKey(
            this.sequenceKeyPattern,
            throttlerName,
            key
        );

        // Every duration this script returns is in milliseconds.
        const script = `
            local redisKey = KEYS[1]
            local blockKey = KEYS[2]
            local sequenceKey = KEYS[3]
            local ttl = tonumber(ARGV[1])
            local limit = tonumber(ARGV[2])
            local blockDuration = tonumber(ARGV[3])

            local time = redis.call('TIME')
            local seconds = tonumber(time[1])
            local microseconds = tonumber(time[2])
            local nowMs = (seconds * 1000) + math.floor(microseconds / 1000)
            local nowUs = (seconds * 1000000) + microseconds

            local function windowRemaining()
                local oldest = redis.call('ZRANGE', redisKey, 0, 0, 'WITHSCORES')
                if not oldest[2] then
                    return 0
                end

                local remaining = ttl - (nowMs - tonumber(oldest[2]))
                if remaining < 0 then
                    return 0
                end

                return remaining
            end

            if redis.call('EXISTS', blockKey) == 1 then
                local blockTtl = redis.call('PTTL', blockKey)
                if blockTtl < 0 then
                    blockTtl = 0
                end

                return {limit + 1, 0, 1, blockTtl}
            end

            redis.call('ZREMRANGEBYSCORE', redisKey, 0, nowMs - ttl)
            local count = redis.call('ZCARD', redisKey)

            if count + 1 > limit then
                local blockTtl = 0
                if blockDuration > 0 then
                    local setResult = redis.call('SET', blockKey, '1', 'PX', blockDuration, 'NX')

                    blockTtl = blockDuration
                    if not setResult then
                        blockTtl = redis.call('PTTL', blockKey)
                        if blockTtl <= 0 then
                            blockTtl = blockDuration
                        end
                    end
                end

                return {count + 1, windowRemaining(), 1, blockTtl}
            end

            local sequence = redis.call('INCR', sequenceKey)
            redis.call('PEXPIRE', sequenceKey, ttl)
            redis.call('ZADD', redisKey, nowMs, string.format('%d-%d', nowUs, sequence))
            redis.call('PEXPIRE', redisKey, ttl)

            return {count + 1, windowRemaining(), 0, 0}
        `;

        try {
            const client = await this.getClient();
            const results = await client.eval(script, {
                keys: [redisKey, blockKey, sequenceKey],
                arguments: [
                    ttl.toString(),
                    limit.toString(),
                    blockDuration.toString(),
                ],
            });

            if (!Array.isArray(results) || results.length < 4) {
                this.logger.error(
                    new Error(
                        `Invalid Redis response: ${JSON.stringify(results)}`
                    ),
                    `Throttler got an invalid response, allowing request. Key: ${key}`
                );

                return this.failOpenRecord();
            }

            const parsed = (results as unknown[]).map(r => Number(r));
            if (parsed.some(n => isNaN(n))) {
                this.logger.error(
                    new Error(
                        `Invalid number from Redis: ${JSON.stringify(results)}`
                    ),
                    `Throttler got a non-numeric value, allowing request. Key: ${key}`
                );

                return this.failOpenRecord();
            }

            const [totalHits, remainingInMs, isBlockedNum, blockTtlInMs] =
                parsed;

            return {
                totalHits,
                timeToExpire: this.toSeconds(remainingInMs),
                isBlocked: isBlockedNum === 1,
                timeToBlockExpire: this.toSeconds(blockTtlInMs),
            };
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : String(error);
            this.logger.error(
                error instanceof Error ? error : new Error(message),
                `Redis unavailable for throttling, allowing request. Key: ${key}`
            );

            return this.failOpenRecord();
        }
    }
}

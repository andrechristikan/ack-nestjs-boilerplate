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

        const script = `
            local redisKey = KEYS[1]
            local blockKey = KEYS[2]
            local ttl = tonumber(ARGV[1])
            local limit = tonumber(ARGV[2])
            local blockDuration = tonumber(ARGV[3])

            local blockExists = redis.call('EXISTS', blockKey)
            if blockExists == 1 then
                local blockTtl = redis.call('PTTL', blockKey)
                local currentCount = redis.call('GET', redisKey)
                return {
                    tonumber(currentCount) or (limit + 1),
                    0,
                    1,
                    blockTtl > 0 and blockTtl or 0
                }
            end

            local count = redis.call('INCR', redisKey)

            local existingTtl = redis.call('PTTL', redisKey)
            if existingTtl == -1 then
                redis.call('PEXPIRE', redisKey, ttl)
            end

            local currentTtl = redis.call('PTTL', redisKey)
            if currentTtl < 0 then
                currentTtl = ttl
            end

            if count > limit and blockDuration > 0 then
                local setResult = redis.call('SET', blockKey, '1', 'PX', blockDuration, 'NX')

                local blockTtl = blockDuration
                if not setResult then
                    blockTtl = redis.call('PTTL', blockKey)
                    if blockTtl <= 0 then
                        blockTtl = blockDuration
                    end
                end

                return {count, currentTtl, 1, blockTtl}
            end

            return {count, currentTtl, 0, 0}
        `;

        try {
            const client = await this.getClient();
            const results = await client.eval(script, {
                keys: [redisKey, blockKey],
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
                return {
                    totalHits: 0,
                    timeToExpire: 0,
                    isBlocked: false,
                    timeToBlockExpire: 0,
                };
            }

            const parsed = (results as unknown[]).map(r => Number(r));
            if (parsed.some(n => isNaN(n))) {
                this.logger.error(
                    new Error(
                        `Invalid number from Redis: ${JSON.stringify(results)}`
                    ),
                    `Throttler got a non-numeric value, allowing request. Key: ${key}`
                );
                return {
                    totalHits: 0,
                    timeToExpire: 0,
                    isBlocked: false,
                    timeToBlockExpire: 0,
                };
            }
            const [totalHits, currentTtl, isBlockedNum, blockTtlNum] = parsed;

            return {
                totalHits,
                timeToExpire: currentTtl > 0 ? currentTtl : 0,
                isBlocked: isBlockedNum === 1,
                timeToBlockExpire: blockTtlNum > 0 ? blockTtlNum : 0,
            };
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : String(error);
            this.logger.error(
                error instanceof Error ? error : new Error(message),
                `Redis unavailable for throttling, allowing request. Key: ${key}`
            );

            return {
                totalHits: 0,
                timeToExpire: 0,
                isBlocked: false,
                timeToBlockExpire: 0,
            };
        }
    }
}

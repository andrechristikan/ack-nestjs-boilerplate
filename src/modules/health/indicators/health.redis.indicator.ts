import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import type KeyvRedis from '@keyv/redis';
import type Keyv from 'keyv';

@Injectable()
export class HealthRedisIndicator {
    private readonly logger = new Logger(HealthRedisIndicator.name);

    constructor(
        @Inject(RedisClientCachedProvider) private readonly keyv: Keyv,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    async isHealthy(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const client = await (
                this.keyv.store as KeyvRedis<string>
            ).getClient();
            await client.ping();

            return indicator.up();
        } catch (err: unknown) {
            this.logger.error(err, 'Redis health check failed');

            return indicator.down('Redis is unreachable');
        }
    }
}

import { RedisCacheClient } from '@common/redis/constants/redis.constant';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import type { Redis } from 'ioredis';

@Injectable()
export class HealthRedisIndicator {
    private readonly logger = new Logger(HealthRedisIndicator.name);

    constructor(
        @Inject(RedisCacheClient) private readonly redis: Redis,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    async isHealthy(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            await this.redis.ping();

            return indicator.up();
        } catch (err: unknown) {
            this.logger.error(err, 'Redis health check failed');

            return indicator.down('Redis is unreachable');
        }
    }
}

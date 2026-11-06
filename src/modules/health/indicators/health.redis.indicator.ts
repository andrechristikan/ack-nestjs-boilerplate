import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { HealthRedisProbeKey } from '@modules/health/constants/health.constant';
import type { Cache } from 'cache-manager';

/**
 * Reports Redis cache reachability as a Terminus health indicator.
 */
@Injectable()
export class HealthRedisIndicator {
    private readonly logger = new Logger(HealthRedisIndicator.name);

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    /**
     * Down when a probe read against the cache fails or throws.
     */
    async isHealthy(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            await this.cacheManager.get(HealthRedisProbeKey);

            return indicator.up();
        } catch (err: unknown) {
            this.logger.error(err, 'Redis health check failed');

            return indicator.down('Redis is unreachable');
        }
    }
}

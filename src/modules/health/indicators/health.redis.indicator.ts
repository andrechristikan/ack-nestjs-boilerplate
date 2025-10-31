import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { Inject, Injectable } from '@nestjs/common';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';
import { Cache } from 'cache-manager';

@Injectable()
export class HealthRedisIndicator {
    constructor(
        @Inject(CacheMainProvider) private cacheManager: Cache,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            await this.cacheManager.get('health-check');

            return indicator.up();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Unknown error';

            return indicator.down(`HealthRedisIndicator Failed - ${message}`);
        }
    }
}

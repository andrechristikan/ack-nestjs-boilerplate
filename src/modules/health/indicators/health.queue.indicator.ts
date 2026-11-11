import {
    EnumHealthIndicatorKey,
    EnumHealthQueue,
} from '@modules/health/enums/health.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { Queue } from 'bullmq';
import { CacheService } from '@common/cache/services/cache.service';

@Injectable()
export class HealthQueueIndicator {
    private readonly logger = new Logger(HealthQueueIndicator.name);

    constructor(
        @InjectQueue(EnumHealthQueue.health)
        private readonly queue: Queue,
        private readonly healthIndicatorService: HealthIndicatorService,
        private readonly cacheService: CacheService
    ) {
        this.registerErrorListener();
    }

    private registerErrorListener(): void {
        this.queue.on('error', (error: Error) => this.onError(error));
    }

    private onError(error: Error): void {
        const isConnection = this.cacheService.isConnectionError(error);
        if (isConnection) {
            return;
        }

        this.logger.warn(error, 'Health queue error');
    }

    async isHealthy(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const backend = this.queue.getBackend();
            const client = await backend.client;
            if (client?.status !== 'ready') {
                return indicator.down('BullMQ Redis client is not ready');
            }

            return indicator.up();
        } catch {
            return indicator.down(
                'HealthQueueIndicator Failed - Unknown error'
            );
        }
    }
}

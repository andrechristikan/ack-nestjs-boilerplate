import {
    EnumHealthIndicatorKey,
    EnumHealthQueue,
} from '@modules/health/enums/health.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { Queue } from 'bullmq';

@Injectable()
export class HealthQueueIndicator {
    private readonly logger = new Logger(HealthQueueIndicator.name);

    constructor(
        @InjectQueue(EnumHealthQueue.health)
        private readonly queue: Queue,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {
        this.registerErrorListener();
    }

    private registerErrorListener(): void {
        this.queue.on('error', (error: Error) => this.onError(error));
    }

    private onError(error: Error): void {
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
        } catch (err: unknown) {
            this.logger.error(err, 'Queue health check failed');

            return indicator.down('BullMQ queue is unreachable');
        }
    }
}

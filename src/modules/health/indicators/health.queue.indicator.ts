import {
    EnumHealthIndicatorKey,
    EnumHealthQueue,
} from '@modules/health/enums/health.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { Queue } from 'bullmq';

@Injectable()
export class HealthQueueIndicator {
    constructor(
        @InjectQueue(EnumHealthQueue.health)
        private readonly queue: Queue,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

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

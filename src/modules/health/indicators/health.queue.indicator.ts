import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';
import { EnumQueue } from '@queues/enums/queue.enum';
import { Queue } from 'bullmq';

/**
 * Reports BullMQ Redis client readiness as a Terminus health indicator.
 */
@Injectable()
export class HealthQueueIndicator {
    constructor(
        @InjectQueue(EnumQueue.notification)
        private readonly queue: Queue,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    /**
     * Down unless the notification queue Redis client status is ready.
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
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

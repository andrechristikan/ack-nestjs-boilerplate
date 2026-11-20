import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Outbox } from '@generated/prisma-client/client';
import { CacheService } from '@common/cache/services/cache.service';
import { EnumQueueJobState } from '@common/queue/enums/queue.enum';
import type { IQueueJobState } from '@common/queue/interfaces/queue.interface';

export abstract class QueueBase {
    private readonly logger = new Logger(QueueBase.name);

    constructor(
        protected readonly queue: Queue,
        protected readonly cacheService: CacheService
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

        this.logger.warn(error, 'Queue error');
    }

    /** Adds one job per row in one addBulk, the row's idempotency key as jobId; a rejection reaches the caller. */
    async enqueue(rows: Outbox[]): Promise<void> {
        await this.queue.addBulk(
            rows.map(row => ({
                name: row.name,
                data: { outboxId: row.id },
                opts: { jobId: row.idempotencyKey, priority: row.priority },
            }))
        );
    }

    /** The state, attempts, and failed reason of the job with that id; null when the job does not exist. */
    async getJobState(jobId: string): Promise<IQueueJobState | null> {
        const found = await this.queue.getJob(jobId);
        const job = found ?? null;
        if (job === null) {
            return null;
        }

        const state = await job.getState();

        return {
            state: state as EnumQueueJobState,
            attemptsMade: job.attemptsMade,
            failedReason: job.failedReason ?? null,
        };
    }
}

import { Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Outbox } from '@generated/prisma-client/client';
import { EnumQueueJobState } from '@common/queue/enums/queue.enum';
import type {
    IQueueJobState,
    IQueueScheduler,
} from '@common/queue/interfaces/queue.interface';

export abstract class QueueBase implements OnModuleInit {
    private readonly logger = new Logger(QueueBase.name);

    constructor(protected readonly queue: Queue) {
        this.registerErrorListener();
    }

    private registerErrorListener(): void {
        this.queue.on('error', (error: Error) => this.onError(error));
    }

    private onError(error: Error): void {
        this.logger.warn(error, 'Queue error');
    }

    protected schedulers(): IQueueScheduler[] {
        return [];
    }

    /** Upserts the declared schedulers and removes every other scheduler of the queue. */
    async onModuleInit(): Promise<void> {
        const schedulers = this.schedulers();
        await Promise.all(
            schedulers.map(({ id, repeat, template }) =>
                this.queue.upsertJobScheduler(id, repeat, template)
            )
        );

        const held = await this.queue.getJobSchedulers();
        const declaredIds = new Set(schedulers.map(({ id }) => id));
        const staleKeys = held
            .map(({ key }) => key)
            .filter(key => !declaredIds.has(key));
        await Promise.all(
            staleKeys.map(key => this.queue.removeJobScheduler(key))
        );

        for (const key of staleKeys) {
            this.logger.log(
                { queue: this.queue.name, scheduler: key },
                'Stale job scheduler removed'
            );
        }
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

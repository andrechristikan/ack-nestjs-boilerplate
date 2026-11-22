import { Worker } from 'bullmq';
import type { Processor, WorkerOptions } from 'bullmq';
import type { Redis } from 'ioredis';

export class QueueWorkerBase extends Worker {
    static connection: Redis | null = null;

    constructor(name: string, processor: Processor, opts: WorkerOptions) {
        super(name, processor, {
            ...opts,
            connection: QueueWorkerBase.connection!,
        });
    }
}

import type { WorkerOptions } from 'bullmq';
import type { EnumQueueJobState } from '@common/queue/enums/queue.enum';

export interface IQueueResponse {
    message: string;
}

export interface IQueueJobState {
    state: EnumQueueJobState;
    attemptsMade: number;
    failedReason: string | null;
}

export type IQueueProcessorOptions = Omit<WorkerOptions, 'name' | 'connection'>;

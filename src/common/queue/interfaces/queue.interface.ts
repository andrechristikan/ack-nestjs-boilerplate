import type { WorkerOptions } from 'bullmq';

export interface IQueueResponse {
    message: string;
}

export type IQueueProcessorOptions = Omit<WorkerOptions, 'name' | 'connection'>;

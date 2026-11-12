import type { WorkerOptions } from 'bullmq';

export interface IQueueResponse {
    message: string;
    [key: string]: unknown;
}

export type IQueueProcessorOptions = Omit<WorkerOptions, 'name' | 'connection'>;

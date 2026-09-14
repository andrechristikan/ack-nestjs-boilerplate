import { WorkerOptions } from 'bullmq';

export interface IQueueResponse {
    message: string;
    [key: string]: unknown;
}

/**
 * Worker tuning a processor may override. `name` and `connection` are owned by
 * `QueueProcessor` and the shared Redis connection.
 */
export type IQueueProcessorOptions = Omit<WorkerOptions, 'name' | 'connection'>;

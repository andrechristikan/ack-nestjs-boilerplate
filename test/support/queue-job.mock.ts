import type { Job } from 'bullmq';

export function createQueueJob<TData, TResult, TName extends string>(
    name: TName,
    data: TData
): Job<TData, TResult, TName> {
    return {
        name,
        data,
        opts: {},
        attemptsMade: 0,
    } as Job<TData, TResult, TName>;
}

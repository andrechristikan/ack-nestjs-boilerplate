import { Processor } from '@nestjs/bullmq';
import { RedisQueueWorkerClient } from '@common/redis/constants/redis.constant';
import type { IQueueProcessorOptions } from '@queues/interfaces/queue.interface';

/** @public */
export function QueueProcessor(
    name: string,
    options?: IQueueProcessorOptions
): ClassDecorator {
    return Processor(
        { name },
        { ...options, connection: RedisQueueWorkerClient }
    );
}

import { Processor } from '@nestjs/bullmq';
import appConfigFunction from '@configs/app.config';
import redisConfigFunction from '@configs/redis.config';
import type { IQueueProcessorOptions } from '@queues/interfaces/queue.interface';

/** @public */
export function QueueProcessor(
    name: string,
    options?: IQueueProcessorOptions
): ClassDecorator {
    const appConfigs = appConfigFunction();
    const redisConfigs = redisConfigFunction();

    return Processor(
        { name },
        {
            ...options,
            connection: {
                url: redisConfigs.queue.url,
                connectionName: `${appConfigs.name}-${appConfigs.env}:processor`,
            },
        }
    );
}

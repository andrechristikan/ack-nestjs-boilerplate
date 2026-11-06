import { Processor } from '@nestjs/bullmq';
import { QueueConfigKey } from '@queues/constants/queue.constant';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueProcessorOptions } from '@queues/interfaces/queue.interface';

/** @public */
export function QueueProcessor(
    name: EnumQueue,
    options?: IQueueProcessorOptions
): ClassDecorator {
    // Config is read through configKey, not ConfigService: a decorator has no
    // injection context.
    return Processor(
        {
            name,
            configKey: QueueConfigKey,
        },
        {
            ...options,
            name: `${process.env.APP_NAME}-${process.env.APP_ENV}:${name}:consumer`,
            connection: {
                url: process.env.QUEUE_REDIS_URL!,
                connectionName: `${process.env.APP_NAME}-${process.env.APP_ENV}:processor`,
            },
        }
    );
}

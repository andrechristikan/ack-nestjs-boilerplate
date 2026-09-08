import { Processor } from '@nestjs/bullmq';
import { QueueProcessorConfigKey } from '@queues/constants/queue.constant';
import { EnumQueue } from '@queues/enums/queue.enum';
import { IQueueProcessorOptions } from '@queues/interfaces/queue.interface';

/**
 * Registers a BullMQ processor with an env-derived consumer worker name.
 * Worker name is resolved from env at decoration time, not at runtime.
 */
export function QueueProcessor(
    name: EnumQueue,
    options?: IQueueProcessorOptions
): ClassDecorator {
    // Config is read through configKey, not ConfigService: a decorator has no
    // injection context.
    return Processor(
        {
            name,
            configKey: QueueProcessorConfigKey,
        },
        {
            name: `${process.env.APP_NAME}-${process.env.APP_ENV}:${name}:consumer`,
            ...options,
        }
    );
}

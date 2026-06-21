import { Processor } from '@nestjs/bullmq';
import { NestWorkerOptions } from '@nestjs/bullmq/dist/interfaces/worker-options.interface';
import { QueueProcessorConfigKey } from '@queues/constants/queue.constant';
import { EnumQueue } from '@queues/enums/queue.enum';

/**
 * Registers a BullMQ processor with an env-derived consumer worker name.
 * Worker name is resolved from env at decoration time, not at runtime.
 */
export function QueueProcessor(
    name: EnumQueue,
    options?: Omit<NestWorkerOptions, 'name'>
): ClassDecorator {
    // @note: currently there is no way to inject ConfigService into decorators
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

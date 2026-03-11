import { Processor } from '@nestjs/bullmq';
import { NestWorkerOptions } from '@nestjs/bullmq/dist/interfaces/worker-options.interface';
import { QueueProcessorConfigKey } from 'src/queues/constants/queue.constant';
import { EnumQueue } from 'src/queues/enums/queue.enum';

/**
 * Decorator for registering BullMQ queue processors.
 * Creates a consumer worker with dynamic naming based on app configuration.
 * Environment variables are accessed at decoration time; for runtime configuration changes,
 * consider using ConfigService injection in the processor class itself.
 *
 * @param name - Queue name from EnumQueue
 * @param options - Optional worker configuration options
 * @returns ClassDecorator for processor class
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

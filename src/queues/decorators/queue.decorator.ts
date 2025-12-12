import { Processor } from '@nestjs/bullmq';
import { NestWorkerOptions } from '@nestjs/bullmq/dist/interfaces/worker-options.interface';
import { QUEUE_PROCESSOR_CONFIG_KEY } from 'src/queues/constants/queue.constant';
import { ENUM_QUEUE } from 'src/queues/enums/queue.enum';

export function QueueProcessor(
    name: ENUM_QUEUE,
    options?: Omit<NestWorkerOptions, 'name'>
): ClassDecorator {
    // @note: currently there is no way to inject ConfigService into decorators
    return Processor(
        {
            name,
            configKey: QUEUE_PROCESSOR_CONFIG_KEY,
        },
        {
            name: `${process.env.APP_NAME}-${process.env.APP_ENV}:${name}:consumer`,
            ...options,
        }
    );
}

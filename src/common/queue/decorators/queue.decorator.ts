import { Processor } from '@nestjs/bullmq';
import type { IQueueProcessorOptions } from '@common/queue/interfaces/queue.interface';

/** @public */
export function QueueProcessor(
    name: string,
    options?: IQueueProcessorOptions
): ClassDecorator {
    return Processor({ name }, { ...options });
}

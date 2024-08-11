import { InjectQueue } from '@nestjs/bullmq';

export function WorkerQueue(queue: string): ParameterDecorator {
    return InjectQueue(queue);
}

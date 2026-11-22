import { Job } from 'bullmq';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import {
    EnumOutboxProcess,
    EnumOutboxQueue,
} from '@common/outbox/enums/outbox.enum';
import type { IOutboxQueueResponse } from '@common/outbox/interfaces/outbox.interface';

@QueueProcessor(EnumOutboxQueue.outbox)
export class OutboxProcessor extends QueueProcessorBase {
    protected async handle(
        job: Job<unknown, IQueueResponse, EnumOutboxProcess>
    ): Promise<IOutboxQueueResponse> {
        switch (job.name) {
            case EnumOutboxProcess.sweep: {
                const count = await this.outboxService.sweep();
                const message = this.messageService.setMessage(
                    'outbox.queue.sweep',
                    { properties: { count } }
                );

                return { message, count };
            }
            default:
                this.throwUnknownProcess(
                    'outbox.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}

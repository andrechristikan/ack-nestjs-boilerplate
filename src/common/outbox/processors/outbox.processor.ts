import { Job } from 'bullmq';
import { CacheService } from '@common/cache/services/cache.service';
import { MessageService } from '@common/message/services/message.service';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { SentryService } from '@common/sentry/services/sentry.service';
import {
    EnumOutboxProcess,
    EnumOutboxQueue,
} from '@common/outbox/enums/outbox.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';

@QueueProcessor(EnumOutboxQueue.outbox)
export class OutboxProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        protected readonly cacheService: CacheService,
        protected readonly outboxService: OutboxService
    ) {
        super(sentryService, messageService, cacheService, outboxService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumOutboxProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumOutboxProcess.sweep: {
                const count = await this.outboxService.sweep();
                const message = this.messageService.setMessage(
                    'outbox.queue.sweep',
                    { properties: { count } }
                );

                return { message, count };
            }
            default: {
                const message = this.messageService.setMessage(
                    'outbox.queue.error.unknownProcess',
                    { properties: { process: job.name } }
                );

                throw new QueueException(message, true);
            }
        }
    }
}

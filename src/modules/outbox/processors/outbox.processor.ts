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
} from '@modules/outbox/enums/outbox.enum';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { OutboxProcessSweepUseCase } from '@modules/outbox/use-cases/outbox.process-sweep.use-case';

@QueueProcessor(EnumOutboxQueue.outbox)
export class OutboxProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        protected readonly cacheService: CacheService,
        protected readonly outboxService: OutboxService,
        private readonly outboxProcessSweepUseCase: OutboxProcessSweepUseCase
    ) {
        super(sentryService, messageService, cacheService, outboxService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumOutboxProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumOutboxProcess.sweep:
                return await this.outboxProcessSweepUseCase.execute();
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

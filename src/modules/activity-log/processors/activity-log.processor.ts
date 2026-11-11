import { CacheService } from '@common/cache/services/cache.service';
import { EnumActivityLogProcess } from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogCreateManyPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogProcessCreateManyUseCase } from '@modules/activity-log/use-cases/activity-log.process-create-many.use-case';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { EnumActivityLogQueue } from '@modules/activity-log/enums/activity-log.enum';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';

@QueueProcessor(EnumActivityLogQueue.activityLog)
export class ActivityLogProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        protected readonly cacheService: CacheService,
        protected readonly outboxService: OutboxService,
        private readonly activityLogProcessCreateManyUseCase: ActivityLogProcessCreateManyUseCase
    ) {
        super(sentryService, messageService, cacheService, outboxService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumActivityLogProcess>,
        data: unknown
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumActivityLogProcess.createMany:
                return await this.activityLogProcessCreateManyUseCase.execute(
                    data as IActivityLogCreateManyPayload
                );
            default: {
                const message = this.messageService.setMessage(
                    'activityLog.queue.error.unknownProcess',
                    { properties: { process: job.name } }
                );

                throw new QueueException(message, true);
            }
        }
    }
}

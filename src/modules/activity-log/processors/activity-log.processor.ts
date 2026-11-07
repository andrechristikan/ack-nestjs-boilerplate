import { EnumActivityLogProcess } from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogCreateManyPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogProcessCreateManyUseCase } from '@modules/activity-log/use-cases/activity-log.process-create-many.use-case';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { QueueException } from '@queues/exceptions/queue.exception';
import { EnumActivityLogQueue } from '@modules/activity-log/enums/activity-log.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@QueueProcessor(EnumActivityLogQueue.activityLog)
export class ActivityLogProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        private readonly activityLogProcessCreateManyUseCase: ActivityLogProcessCreateManyUseCase
    ) {
        super(sentryService, messageService);
    }

    protected async handle(
        job: Job<
            IActivityLogCreateManyPayload,
            IQueueResponse,
            EnumActivityLogProcess
        >
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumActivityLogProcess.createMany:
                return await this.activityLogProcessCreateManyUseCase.execute(
                    job
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

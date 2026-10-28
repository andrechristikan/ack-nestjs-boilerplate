import { EnumActivityLogProcess } from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogCreateManyPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogProcessorService } from '@modules/activity-log/services/activity-log.processor.service';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Consumes the activity-log queue; currently only the staged rows write.
 */
@QueueProcessor(EnumQueue.activityLog)
export class ActivityLogProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        private readonly activityLogProcessorService: ActivityLogProcessorService
    ) {
        super(sentryService);
    }

    /** Dispatches each job to its handler by job name. */
    protected async handle(
        job: Job<
            IActivityLogCreateManyPayload,
            IQueueResponse,
            EnumActivityLogProcess
        >
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumActivityLogProcess.createMany:
                return await this.activityLogProcessorService.processCreateMany(
                    job
                );
            default:
                this.activityLogProcessorService.processUnknown(job.name);
        }
    }
}

import { EnumActivityLogProcess } from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogCreateManyPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogProcessCreateManyUseCase } from '@modules/activity-log/use-cases/activity-log.process-create-many.use-case';
import { ActivityLogProcessPurgeExpiredUseCase } from '@modules/activity-log/use-cases/activity-log.process-purge-expired.use-case';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { EnumActivityLogQueue } from '@modules/activity-log/enums/activity-log.enum';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';

@QueueProcessor(EnumActivityLogQueue.activityLog)
export class ActivityLogProcessor extends QueueProcessorBase {
    constructor(
        private readonly activityLogProcessCreateManyUseCase: ActivityLogProcessCreateManyUseCase,
        private readonly activityLogProcessPurgeExpiredUseCase: ActivityLogProcessPurgeExpiredUseCase
    ) {
        super();
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
            case EnumActivityLogProcess.purgeExpired:
                return await this.activityLogProcessPurgeExpiredUseCase.execute();
            default:
                this.throwUnknownProcess(
                    'activityLog.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}

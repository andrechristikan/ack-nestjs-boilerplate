import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceProcessorService } from '@modules/workspace/services/workspace.processor.service';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Consumes the workspace queue; currently only the recurring stale-invite expiry sweep.
 */
@QueueProcessor(EnumQueue.workspace)
export class WorkspaceProcessor extends QueueProcessorBase {
    constructor(
        private readonly workspaceProcessorService: WorkspaceProcessorService,
        sentryService: SentryService
    ) {
        super(sentryService);
    }

    /** Dispatches each job to its handler by job name. */
    protected async handle(
        job: Job<unknown, IQueueResponse, EnumWorkspaceProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumWorkspaceProcess.expireStaleInvites:
                return await this.workspaceProcessorService.processExpireStaleInvites();
            default:
                return {
                    message: `No workspace processor found for the given job name ${job.name}`,
                };
        }
    }
}

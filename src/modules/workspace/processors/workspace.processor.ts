import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceProcessorService } from '@modules/workspace/services/workspace.processor.service';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Consumes the workspace queue; currently only the recurring stale-invite expiry sweep.
 */
@QueueProcessor(EnumQueue.workspace)
export class WorkspaceProcessor extends QueueProcessorBase {
    private readonly logger = new Logger(WorkspaceProcessor.name);

    constructor(
        private readonly workspaceProcessorService: WorkspaceProcessorService
    ) {
        super();
    }

    /** Dispatches each job to its handler by job name. */
    async process(
        job: Job<unknown, IQueueResponse, EnumWorkspaceProcess>
    ): Promise<IQueueResponse> {
        try {
            switch (job.name) {
                case EnumWorkspaceProcess.expireStaleInvites:
                    return this.workspaceProcessorService.processExpireStaleInvites();
                default:
                    return {
                        message: `No workspace processor found for the given job name ${job.name}`,
                    };
            }
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to process workspace job');
            throw error;
        }
    }
}

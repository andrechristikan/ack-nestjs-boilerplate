import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceProcessorService } from '@modules/workspace/services/processor/workspace.processor.service';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@QueueProcessor(EnumQueue.workspace)
export class WorkspaceProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        private readonly workspaceProcessorService: WorkspaceProcessorService
    ) {
        super(sentryService, messageService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumWorkspaceProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumWorkspaceProcess.expireStaleInvites:
                return await this.workspaceProcessorService.processExpireStaleInvites();
            case EnumWorkspaceProcess.expireStaleJoinRequests:
                return await this.workspaceProcessorService.processExpireStaleJoinRequests();
            default:
                this.workspaceProcessorService.processUnknown(job.name);
        }
    }
}

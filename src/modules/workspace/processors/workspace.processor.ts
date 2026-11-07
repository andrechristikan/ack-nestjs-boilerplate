import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceProcessExpireStaleInvitesUseCase } from '@modules/workspace/use-cases/workspace.process-expire-stale-invites.use-case';
import { WorkspaceProcessExpireStaleJoinRequestsUseCase } from '@modules/workspace/use-cases/workspace.process-expire-stale-join-requests.use-case';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumWorkspaceQueue } from '@modules/workspace/enums/workspace.enum';
import { QueueException } from '@queues/exceptions/queue.exception';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@QueueProcessor(EnumWorkspaceQueue.workspace)
export class WorkspaceProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        private readonly workspaceProcessExpireStaleInvitesUseCase: WorkspaceProcessExpireStaleInvitesUseCase,
        private readonly workspaceProcessExpireStaleJoinRequestsUseCase: WorkspaceProcessExpireStaleJoinRequestsUseCase
    ) {
        super(sentryService, messageService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumWorkspaceProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumWorkspaceProcess.expireStaleInvites:
                return await this.workspaceProcessExpireStaleInvitesUseCase.execute();
            case EnumWorkspaceProcess.expireStaleJoinRequests:
                return await this.workspaceProcessExpireStaleJoinRequestsUseCase.execute();
            default: {
                const message = this.messageService.setMessage(
                    'workspace.queue.error.unknownProcess',
                    { properties: { process: job.name } }
                );

                throw new QueueException(message, true);
            }
        }
    }
}

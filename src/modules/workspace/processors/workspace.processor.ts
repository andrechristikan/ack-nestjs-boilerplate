import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceProcessExpireStaleInvitesUseCase } from '@modules/workspace/use-cases/workspace.process-expire-stale-invites.use-case';
import { WorkspaceProcessExpireStaleJoinRequestsUseCase } from '@modules/workspace/use-cases/workspace.process-expire-stale-join-requests.use-case';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { EnumWorkspaceQueue } from '@modules/workspace/enums/workspace.enum';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';

@QueueProcessor(EnumWorkspaceQueue.workspace)
export class WorkspaceProcessor extends QueueProcessorBase {
    constructor(
        private readonly workspaceProcessExpireStaleInvitesUseCase: WorkspaceProcessExpireStaleInvitesUseCase,
        private readonly workspaceProcessExpireStaleJoinRequestsUseCase: WorkspaceProcessExpireStaleJoinRequestsUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumWorkspaceProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumWorkspaceProcess.expireStaleInvites:
                return await this.workspaceProcessExpireStaleInvitesUseCase.execute();
            case EnumWorkspaceProcess.expireStaleJoinRequests:
                return await this.workspaceProcessExpireStaleJoinRequestsUseCase.execute();
            default:
                this.throwUnknownProcess(
                    'workspace.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}

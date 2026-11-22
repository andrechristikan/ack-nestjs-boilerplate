import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceProcessExpireStaleInvitesUseCase } from '@modules/workspace/use-cases/workspace.process-expire-stale-invites.use-case';
import { WorkspaceProcessExpireStaleJoinRequestsUseCase } from '@modules/workspace/use-cases/workspace.process-expire-stale-join-requests.use-case';
import { WorkspaceProcessSoftDeleteUseCase } from '@modules/workspace/use-cases/workspace.process-soft-delete.use-case';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { EnumWorkspaceQueue } from '@modules/workspace/enums/workspace.enum';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type { IWorkspaceSoftDeletePayload } from '@modules/workspace/interfaces/workspace.interface';

@QueueProcessor(EnumWorkspaceQueue.workspace)
export class WorkspaceProcessor extends QueueProcessorBase {
    constructor(
        private readonly workspaceProcessExpireStaleInvitesUseCase: WorkspaceProcessExpireStaleInvitesUseCase,
        private readonly workspaceProcessExpireStaleJoinRequestsUseCase: WorkspaceProcessExpireStaleJoinRequestsUseCase,
        private readonly workspaceProcessSoftDeleteUseCase: WorkspaceProcessSoftDeleteUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumWorkspaceProcess>,
        data: unknown
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumWorkspaceProcess.expireStaleInvites:
                return await this.workspaceProcessExpireStaleInvitesUseCase.execute();
            case EnumWorkspaceProcess.expireStaleJoinRequests:
                return await this.workspaceProcessExpireStaleJoinRequestsUseCase.execute();
            case EnumWorkspaceProcess.softDelete:
                return await this.workspaceProcessSoftDeleteUseCase.execute(
                    data as IWorkspaceSoftDeletePayload
                );
            default:
                this.throwUnknownProcess(
                    'workspace.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}

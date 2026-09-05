import { IWorkspaceProcessorService } from '@modules/workspace/interfaces/workspace.processor.service.interface';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class WorkspaceProcessorService
    implements IWorkspaceProcessorService, OnModuleInit
{
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceQueue: WorkspaceQueue
    ) {}

    async onModuleInit(): Promise<void> {
        await this.workspaceQueue.scheduleInviteExpirySweep();
    }

    async processExpireStaleInvites(): Promise<IQueueResponse> {
        const count = await this.workspaceInviteService.expireStalePending();

        return {
            message: 'Processed stale workspace invite expiry sweep',
            countExpiredInvites: count,
        };
    }
}

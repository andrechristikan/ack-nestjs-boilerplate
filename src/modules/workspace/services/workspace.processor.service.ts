import { IWorkspaceProcessorService } from '@modules/workspace/interfaces/workspace.processor.service.interface';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceInviteUtil } from '@modules/workspace/utils/workspace.invite.util';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class WorkspaceProcessorService
    implements IWorkspaceProcessorService, OnModuleInit
{
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceInviteUtil: WorkspaceInviteUtil
    ) {}

    async onModuleInit(): Promise<void> {
        await this.workspaceInviteUtil.scheduleInviteExpirySweep();
    }

    async processExpireStaleInvites(): Promise<IQueueResponse> {
        const count = await this.workspaceInviteService.expireStalePending();

        return {
            message: 'Processed stale workspace invite expiry sweep',
            countExpiredInvites: count,
        };
    }
}

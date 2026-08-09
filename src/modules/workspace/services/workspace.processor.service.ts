import { IWorkspaceProcessorService } from '@modules/workspace/interfaces/workspace.processor.service.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceInviteUtil } from '@modules/workspace/utils/workspace.invite.util';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class WorkspaceProcessorService
    implements IWorkspaceProcessorService, OnModuleInit
{
    constructor(
        private readonly workspaceInviteRepository: WorkspaceInviteRepository,
        private readonly workspaceInviteUtil: WorkspaceInviteUtil
    ) {}

    async onModuleInit(): Promise<void> {
        await this.workspaceInviteUtil.scheduleInviteExpirySweep();
    }

    async processExpireStaleInvites(): Promise<IQueueResponse> {
        const count = await this.workspaceInviteRepository.expireStalePending();

        return {
            message: 'Processed stale workspace invite expiry sweep',
            countExpiredInvites: count,
        };
    }
}

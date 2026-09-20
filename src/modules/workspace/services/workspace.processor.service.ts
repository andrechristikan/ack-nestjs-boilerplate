import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';
import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class WorkspaceProcessorService implements OnModuleInit {
    constructor(
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly workspaceQueue: WorkspaceQueue
    ) {}

    async onModuleInit(): Promise<void> {
        await this.workspaceQueue.scheduleInviteExpirySweep();
    }

    async processExpireStaleInvites(): Promise<IQueueResponse> {
        const count = await this.workspaceInviteDomain.expireStalePending();

        return {
            message: 'Processed stale workspace invite expiry sweep',
            countExpiredInvites: count,
        };
    }
}

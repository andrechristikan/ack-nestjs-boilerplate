import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';
import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@queues/exceptions/queue.exception';

@Injectable()
export class WorkspaceProcessorService implements OnModuleInit {
    constructor(
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly workspaceQueue: WorkspaceQueue,
        private readonly messageService: MessageService
    ) {}

    async onModuleInit(): Promise<void> {
        await this.workspaceQueue.scheduleInviteExpirySweep();
    }

    async processExpireStaleInvites(): Promise<IQueueResponse> {
        const count = await this.workspaceInviteDomain.expireStalePending();

        const message = this.messageService.setMessage(
            'workspace.queue.expireStaleInvites'
        );

        return {
            message,
            countExpiredInvites: count,
        };
    }
    processUnknown(process: string): never {
        const message = this.messageService.setMessage(
            'workspace.queue.error.unknownProcess',
            { properties: { process } }
        );

        throw new QueueException(message, true);
    }
}

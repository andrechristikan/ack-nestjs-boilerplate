import { MessageService } from '@common/message/services/message.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceProcessExpireStaleInvitesUseCase implements IAppUseCase<
    [],
    IQueueResponse
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly messageService: MessageService
    ) {}

    async execute(): Promise<IQueueResponse> {
        const count = await this.workspaceInviteService.expireStalePending();

        const message = this.messageService.setMessage(
            'workspace.queue.expireStaleInvites'
        );

        return {
            message,
            countExpiredInvites: count,
        };
    }
}

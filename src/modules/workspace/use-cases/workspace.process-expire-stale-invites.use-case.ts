import { MessageService } from '@common/message/services/message.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IWorkspaceExpireStaleInvitesQueueResponse } from '@modules/workspace/interfaces/workspace.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceProcessExpireStaleInvitesUseCase implements IAppUseCase<
    [],
    IWorkspaceExpireStaleInvitesQueueResponse
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly messageService: MessageService
    ) {}

    async execute(): Promise<IWorkspaceExpireStaleInvitesQueueResponse> {
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

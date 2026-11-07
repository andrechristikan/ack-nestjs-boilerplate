import { MessageService } from '@common/message/services/message.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceProcessExpireStaleJoinRequestsUseCase implements IAppUseCase<
    [],
    IQueueResponse
> {
    constructor(
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly messageService: MessageService
    ) {}

    async execute(): Promise<IQueueResponse> {
        const count =
            await this.workspaceJoinRequestService.expireStalePending();

        const message = this.messageService.setMessage(
            'workspace.queue.expireStaleJoinRequests'
        );

        return {
            message,
            countExpiredJoinRequests: count,
        };
    }
}

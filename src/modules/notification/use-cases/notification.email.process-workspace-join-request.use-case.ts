import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailWorkspaceService } from '@modules/notification/services/notification.email.workspace.service';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationEmailProcessWorkspaceJoinRequestUseCase implements IAppUseCase<
    [
        Job<
            INotificationEmailQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >,
    ],
    IQueueResponse
> {
    constructor(
        private readonly notificationEmailWorkspaceService: NotificationEmailWorkspaceService
    ) {}

    async execute(
        job: Job<
            INotificationEmailQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailWorkspaceService.processWorkspaceJoinRequest(
            job.data.send,
            job.data.data
        );
    }
}

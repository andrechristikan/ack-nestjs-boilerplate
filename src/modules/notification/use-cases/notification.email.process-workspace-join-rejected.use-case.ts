import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationWorkspaceJoinRejectedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailWorkspaceService } from '@modules/notification/services/notification.email.workspace.service';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationEmailProcessWorkspaceJoinRejectedUseCase implements IAppUseCase<
    [
        Job<
            INotificationEmailQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
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
            INotificationEmailQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailWorkspaceService.processWorkspaceJoinRejected(
            job.data.send,
            job.data.data
        );
    }
}

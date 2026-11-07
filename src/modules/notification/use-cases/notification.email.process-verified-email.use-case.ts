import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationVerifiedEmailPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailAccountService } from '@modules/notification/services/notification.email.account.service';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationEmailProcessVerifiedEmailUseCase implements IAppUseCase<
    [
        Job<
            INotificationEmailQueuePayload<INotificationVerifiedEmailPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >,
    ],
    IQueueResponse
> {
    constructor(
        private readonly notificationEmailAccountService: NotificationEmailAccountService
    ) {}

    async execute(
        job: Job<
            INotificationEmailQueuePayload<INotificationVerifiedEmailPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailAccountService.processVerifiedEmail(
            job.data.send,
            job.data.data
        );
    }
}

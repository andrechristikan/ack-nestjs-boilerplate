import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationVerificationEmailEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailAccountService } from '@modules/notification/services/notification.email.account.service';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationEmailProcessVerificationEmailUseCase implements IAppUseCase<
    [
        Job<
            INotificationEmailQueuePayload<INotificationVerificationEmailEncryptedPayload>,
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
            INotificationEmailQueuePayload<INotificationVerificationEmailEncryptedPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailAccountService.processVerificationEmail(
            job.data.send,
            job.data.data
        );
    }
}

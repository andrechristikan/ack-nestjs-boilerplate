import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationVerifiedMobileNumberEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailAccountService } from '@modules/notification/services/notification.email.account.service';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationEmailProcessVerifiedMobileNumberUseCase implements IAppUseCase<
    [
        Job<
            INotificationEmailQueuePayload<INotificationVerifiedMobileNumberEncryptedPayload>,
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
            INotificationEmailQueuePayload<INotificationVerifiedMobileNumberEncryptedPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailAccountService.processVerifiedMobileNumber(
            job.data.send,
            job.data.data
        );
    }
}

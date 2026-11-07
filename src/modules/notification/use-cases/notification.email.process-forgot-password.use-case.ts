import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationForgotPasswordEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailSecurityService } from '@modules/notification/services/notification.email.security.service';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationEmailProcessForgotPasswordUseCase implements IAppUseCase<
    [
        Job<
            INotificationEmailQueuePayload<INotificationForgotPasswordEncryptedPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >,
    ],
    IQueueResponse
> {
    constructor(
        private readonly notificationEmailSecurityService: NotificationEmailSecurityService
    ) {}

    async execute(
        job: Job<
            INotificationEmailQueuePayload<INotificationForgotPasswordEncryptedPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailSecurityService.processForgotPassword(
            job.data.send,
            job.data.data
        );
    }
}

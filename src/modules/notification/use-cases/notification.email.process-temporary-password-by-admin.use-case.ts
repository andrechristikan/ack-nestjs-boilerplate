import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationTemporaryPasswordEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailSecurityService } from '@modules/notification/services/notification.email.security.service';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationEmailProcessTemporaryPasswordByAdminUseCase implements IAppUseCase<
    [
        Job<
            INotificationEmailQueuePayload<INotificationTemporaryPasswordEncryptedPayload>,
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
            INotificationEmailQueuePayload<INotificationTemporaryPasswordEncryptedPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailSecurityService.processTemporaryPasswordByAdmin(
            job.data.send,
            job.data.data
        );
    }
}

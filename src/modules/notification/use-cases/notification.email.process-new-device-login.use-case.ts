import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationNewDeviceLoginPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailSecurityService } from '@modules/notification/services/notification.email.security.service';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationEmailProcessNewDeviceLoginUseCase implements IAppUseCase<
    [
        Job<
            INotificationEmailQueuePayload<INotificationNewDeviceLoginPayload>,
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
            INotificationEmailQueuePayload<INotificationNewDeviceLoginPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailSecurityService.processNewDeviceLogin(
            job.data.send,
            job.data.data
        );
    }
}

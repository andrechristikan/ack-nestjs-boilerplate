import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailBulkQueuePayload,
    INotificationPublishTermPolicyPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailTermPolicyService } from '@modules/notification/services/notification.email.term-policy.service';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationEmailProcessPublishTermPolicyUseCase implements IAppUseCase<
    [
        Job<
            INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >,
    ],
    IQueueResponse
> {
    constructor(
        private readonly notificationEmailTermPolicyService: NotificationEmailTermPolicyService
    ) {}

    async execute(
        job: Job<
            INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailTermPolicyService.processPublishTermPolicy(
            job.data.data,
            job.data.batchId,
            job.data.proceedBy,
            job.data.recipients
        );
    }
}

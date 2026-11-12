import type {
    INotificationEmailBulkQueuePayload,
    INotificationPublishTermPolicyPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailTermPolicyService } from '@modules/notification/services/notification.email.term-policy.service';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationEmailProcessPublishTermPolicyUseCase implements IAppUseCase<
    [INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload>],
    IQueueResponse
> {
    constructor(
        private readonly notificationEmailTermPolicyService: NotificationEmailTermPolicyService
    ) {}

    async execute({
        data,
        batchId,
        proceedBy,
        recipients,
    }: INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload>): Promise<IQueueResponse> {
        return this.notificationEmailTermPolicyService.processPublishTermPolicy(
            data,
            batchId,
            proceedBy,
            recipients
        );
    }
}

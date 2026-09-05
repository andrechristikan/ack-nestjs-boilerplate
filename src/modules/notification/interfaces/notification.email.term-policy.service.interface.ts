import { INotificationPublishTermPolicyPayload } from '@modules/notification/interfaces/notification.interface';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationEmailTermPolicyService {
    processPublishTermPolicy(
        data: INotificationPublishTermPolicyPayload
    ): Promise<IQueueResponse>;
}

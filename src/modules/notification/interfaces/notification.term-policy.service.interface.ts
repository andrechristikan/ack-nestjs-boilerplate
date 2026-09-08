import {
    INotificationAcceptTermPolicyPayload,
    INotificationPublishTermPolicyPayload,
} from '@modules/notification/interfaces/notification.interface';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationTermPolicyService {
    processPublishTermPolicy(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload
    ): Promise<IQueueResponse>;
    processUserAcceptTermPolicy(
        userId: string,
        data: INotificationAcceptTermPolicyPayload
    ): Promise<IQueueResponse>;
}

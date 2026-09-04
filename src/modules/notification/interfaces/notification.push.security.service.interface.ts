import {
    INotificationNewDeviceLoginPayload,
    INotificationSendPushPayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationPushSecurityService {
    processNewDeviceLogin(
        send: INotificationSendPushPayload,
        data: INotificationNewDeviceLoginPayload
    ): Promise<IQueueResponse>;
    processResetTwoFactorByAdmin(
        send: INotificationSendPushPayload
    ): Promise<IQueueResponse>;
    processTemporaryPasswordByAdmin(
        send: INotificationSendPushPayload,
        data: INotificationTemporaryPasswordPayload
    ): Promise<IQueueResponse>;
    processResetPassword(
        send: INotificationSendPushPayload
    ): Promise<IQueueResponse>;
    processForgotPassword(
        send: INotificationSendPushPayload
    ): Promise<IQueueResponse>;
}

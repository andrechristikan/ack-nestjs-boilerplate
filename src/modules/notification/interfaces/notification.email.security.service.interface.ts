import {
    INotificationEmailSendPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationEmailSecurityService {
    processTemporaryPasswordByAdmin(
        send: INotificationEmailSendPayload,
        data: INotificationTemporaryPasswordPayload
    ): Promise<IQueueResponse>;
    processChangePassword(
        send: INotificationEmailSendPayload
    ): Promise<IQueueResponse>;
    processResetPassword(
        send: INotificationEmailSendPayload
    ): Promise<IQueueResponse>;
    processForgotPassword(
        send: INotificationEmailSendPayload,
        data: INotificationForgotPasswordPayload
    ): Promise<IQueueResponse>;
    processResetTwoFactorByAdmin(
        send: INotificationEmailSendPayload
    ): Promise<IQueueResponse>;
    processNewDeviceLogin(
        send: INotificationEmailSendPayload,
        data: INotificationNewDeviceLoginPayload
    ): Promise<IQueueResponse>;
}

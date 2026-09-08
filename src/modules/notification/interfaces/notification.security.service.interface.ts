import {
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationSecurityService {
    processTemporaryPasswordByAdmin(
        userId: string,
        proceedBy: string,
        data: INotificationTemporaryPasswordPayload
    ): Promise<IQueueResponse>;
    processChangePassword(userId: string): Promise<IQueueResponse>;
    processForgotPassword(
        userId: string,
        data: INotificationForgotPasswordPayload
    ): Promise<IQueueResponse>;
    processResetPassword(userId: string): Promise<IQueueResponse>;
    processResetTwoFactorByAdmin(
        userId: string,
        proceedBy: string
    ): Promise<IQueueResponse>;
    processNewDeviceLogin(
        userId: string,
        data: INotificationNewDeviceLoginPayload
    ): Promise<IQueueResponse>;
}

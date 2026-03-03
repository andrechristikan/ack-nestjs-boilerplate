import {
    INotificationEmailSendPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
} from '@modules/notification/interfaces/notification.interface';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

export interface INotificationEmailProcessorService {
    processChangePassword(
        data: INotificationEmailSendPayload
    ): Promise<IQueueResponse>;
    processWelcome(
        data: INotificationEmailSendPayload
    ): Promise<IQueueResponse>;
    processWelcomeByAdmin(
        data: INotificationEmailSendPayload,
        payload: INotificationWelcomeByAdminPayload
    ): Promise<IQueueResponse>;
    processTemporaryPasswordByAdmin(
        data: INotificationEmailSendPayload,
        payload: INotificationTemporaryPasswordPayload
    ): Promise<IQueueResponse>;
    processForgotPassword(
        data: INotificationEmailSendPayload,
        payload: INotificationForgotPasswordPayload
    ): Promise<IQueueResponse>;
    processVerificationEmail(
        data: INotificationEmailSendPayload,
        payload: INotificationVerificationEmailPayload
    ): Promise<IQueueResponse>;
    processVerifiedEmail(
        data: INotificationEmailSendPayload,
        payload: INotificationVerifiedEmailPayload
    ): Promise<IQueueResponse>;
    processVerifiedMobileNumber(
        data: INotificationEmailSendPayload,
        payload: INotificationVerifiedMobileNumberPayload
    ): Promise<IQueueResponse>;
    processNewDeviceLogin(
        data: INotificationEmailSendPayload,
        payload: INotificationNewDeviceLoginPayload
    ): Promise<IQueueResponse>;
}

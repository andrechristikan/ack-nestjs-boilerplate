import { IEmailSendPayload } from '@modules/email/interfaces/email.interface';
import {
    INotificationCreateByAdminPayload,
    INotificationEmailVerificationPayload,
    INotificationEmailVerifiedPayload,
    INotificationForgotPasswordPayload,
    INotificationMobileNumberVerifiedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

export interface IEmailProcessorService {
    processChangePassword(data: IEmailSendPayload): Promise<IQueueResponse>;
    processWelcome(data: IEmailSendPayload): Promise<IQueueResponse>;
    processCreateByAdmin(
        data: IEmailSendPayload,
        payload: INotificationCreateByAdminPayload
    ): Promise<IQueueResponse>;
    processTemporaryPasswordByAdmin(
        data: IEmailSendPayload,
        payload: INotificationTemporaryPasswordPayload
    ): Promise<IQueueResponse>;
    processForgotPassword(
        data: IEmailSendPayload,
        payload: INotificationForgotPasswordPayload
    ): Promise<IQueueResponse>;
    processVerification(
        data: IEmailSendPayload,
        payload: INotificationEmailVerificationPayload
    ): Promise<IQueueResponse>;
    processEmailVerified(
        data: IEmailSendPayload,
        payload: INotificationEmailVerifiedPayload
    ): Promise<IQueueResponse>;
    processMobileNumberVerified(
        data: IEmailSendPayload,
        payload: INotificationMobileNumberVerifiedPayload
    ): Promise<IQueueResponse>;
    processNewDeviceLogin(
        data: IEmailSendPayload,
        payload: INotificationNewDeviceLoginPayload
    ): Promise<IQueueResponse>;
}

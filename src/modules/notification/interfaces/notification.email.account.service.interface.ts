import {
    INotificationEmailSendPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
} from '@modules/notification/interfaces/notification.interface';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationEmailAccountService {
    processWelcome(
        send: INotificationEmailSendPayload
    ): Promise<IQueueResponse>;
    processWelcomeSocial(
        send: INotificationEmailSendPayload
    ): Promise<IQueueResponse>;
    processWelcomeByAdmin(
        send: INotificationEmailSendPayload,
        data: INotificationWelcomeByAdminPayload
    ): Promise<IQueueResponse>;
    processVerificationEmail(
        send: INotificationEmailSendPayload,
        data: INotificationVerificationEmailPayload
    ): Promise<IQueueResponse>;
    processVerifiedEmail(
        send: INotificationEmailSendPayload,
        data: INotificationVerifiedEmailPayload
    ): Promise<IQueueResponse>;
    processVerifiedMobileNumber(
        send: INotificationEmailSendPayload,
        data: INotificationVerifiedMobileNumberPayload
    ): Promise<IQueueResponse>;
}

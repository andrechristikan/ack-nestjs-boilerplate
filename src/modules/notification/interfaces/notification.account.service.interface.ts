import {
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
} from '@modules/notification/interfaces/notification.interface';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationAccountService {
    processWelcomeByAdmin(
        userId: string,
        proceedBy: string,
        data: INotificationWelcomeByAdminPayload
    ): Promise<IQueueResponse>;
    processWelcome(
        userId: string,
        data: INotificationVerificationEmailPayload
    ): Promise<IQueueResponse>;
    processWelcomeSocial(userId: string): Promise<IQueueResponse>;
    processVerifiedEmail(
        userId: string,
        data: INotificationVerifiedEmailPayload
    ): Promise<IQueueResponse>;
    processVerificationEmail(
        userId: string,
        data: INotificationVerificationEmailPayload
    ): Promise<IQueueResponse>;
    processVerifiedMobileNumber(
        userId: string,
        data: INotificationVerifiedMobileNumberPayload
    ): Promise<IQueueResponse>;
}

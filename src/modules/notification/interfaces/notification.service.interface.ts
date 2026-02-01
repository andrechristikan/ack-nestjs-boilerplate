import {
    INotificationNewLoginPayload,
    INotificationSendPayload,
} from '@modules/notification/interfaces/notification.interface';

export interface INotificationService {
    sendNewLogin(
        send: INotificationSendPayload,
        payload: INotificationNewLoginPayload
    ): Promise<void>;
}

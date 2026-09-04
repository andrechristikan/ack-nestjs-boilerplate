import {
    INotificationEmailSendPayload,
    INotificationEmailSendUnregisteredPayload,
    INotificationWorkspaceInvitePayload,
    INotificationWorkspaceInviteUnregisteredPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPayload,
} from '@modules/notification/interfaces/notification.interface';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationEmailWorkspaceService {
    processWorkspaceInvite(
        send: INotificationEmailSendPayload,
        data: INotificationWorkspaceInvitePayload
    ): Promise<IQueueResponse>;
    processWorkspaceInviteUnregistered(
        send: INotificationEmailSendUnregisteredPayload,
        data: INotificationWorkspaceInviteUnregisteredPayload
    ): Promise<IQueueResponse>;
    processWorkspaceJoinRequest(
        send: INotificationEmailSendPayload,
        data: INotificationWorkspaceJoinRequestPayload
    ): Promise<IQueueResponse>;
    processWorkspaceJoinAccepted(
        send: INotificationEmailSendPayload,
        data: INotificationWorkspaceJoinAcceptedPayload
    ): Promise<IQueueResponse>;
    processWorkspaceJoinRejected(
        send: INotificationEmailSendPayload,
        data: INotificationWorkspaceJoinRejectedPayload
    ): Promise<IQueueResponse>;
}

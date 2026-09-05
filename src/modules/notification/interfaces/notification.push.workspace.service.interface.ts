import {
    INotificationSendPushPayload,
    INotificationWorkspaceInvitePayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPayload,
} from '@modules/notification/interfaces/notification.interface';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationPushWorkspaceService {
    processWorkspaceInvite(
        send: INotificationSendPushPayload,
        data: INotificationWorkspaceInvitePayload
    ): Promise<IQueueResponse>;
    processWorkspaceJoinRequest(
        send: INotificationSendPushPayload,
        data: INotificationWorkspaceJoinRequestPayload
    ): Promise<IQueueResponse>;
    processWorkspaceJoinAccepted(
        send: INotificationSendPushPayload,
        data: INotificationWorkspaceJoinAcceptedPayload
    ): Promise<IQueueResponse>;
    processWorkspaceJoinRejected(
        send: INotificationSendPushPayload,
        data: INotificationWorkspaceJoinRejectedPayload
    ): Promise<IQueueResponse>;
}

import {
    INotificationWorkspaceInvitePayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPayload,
} from '@modules/notification/interfaces/notification.interface';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationWorkspaceService {
    processWorkspaceInvite(
        userId: string,
        proceedBy: string,
        data: INotificationWorkspaceInvitePayload
    ): Promise<IQueueResponse>;
    processWorkspaceJoinRequest(
        userId: string,
        proceedBy: string,
        data: INotificationWorkspaceJoinRequestPayload
    ): Promise<IQueueResponse>;
    processWorkspaceJoinAccepted(
        userId: string,
        proceedBy: string,
        data: INotificationWorkspaceJoinAcceptedPayload
    ): Promise<IQueueResponse>;
    processWorkspaceJoinRejected(
        userId: string,
        proceedBy: string,
        data: INotificationWorkspaceJoinRejectedPayload
    ): Promise<IQueueResponse>;
}

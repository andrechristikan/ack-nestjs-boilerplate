import { FirebaseService } from '@common/firebase/services/firebase.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client';
import {
    INotificationSendPushPayload,
    INotificationWorkspaceInvitePayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPayload,
} from '@modules/notification/interfaces/notification.interface';
import { INotificationPushWorkspaceService } from '@modules/notification/interfaces/notification.push.workspace.service.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { Injectable } from '@nestjs/common';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Renders and delivers the workspace invite and join-request push messages. */
@Injectable()
export class NotificationPushWorkspaceService implements INotificationPushWorkspaceService {
    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly notificationRepository: NotificationRepository,
        private readonly messageService: MessageService,
        private readonly notificationPushQueue: NotificationPushQueue
    ) {}

    async processWorkspaceInvite(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        data: INotificationWorkspaceInvitePayload
    ): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping workspace invite notification',
            };
        }

        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!notification) {
            return {
                message:
                    'Notification not found, skipping workspace invite notification',
            };
        }

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: {
                username,
                workspaceName: data.workspaceName,
                inviterName: data.inviterName,
            },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.allSettled([
            this.notificationPushQueue.sendCleanupTokens(
                userId,
                result.failureTokens
            ),
            this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                result.failureTokens
            ),
        ]);

        return {
            message: 'Workspace invite notification processed',
            result,
        };
    }

    async processWorkspaceJoinRequest(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        data: INotificationWorkspaceJoinRequestPayload
    ): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping workspace join request notification',
            };
        }

        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!notification) {
            return {
                message:
                    'Notification not found, skipping workspace join request notification',
            };
        }

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: {
                username,
                workspaceName: data.workspaceName,
                requesterName: data.requesterName,
            },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.allSettled([
            this.notificationPushQueue.sendCleanupTokens(
                userId,
                result.failureTokens
            ),
            this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                result.failureTokens
            ),
        ]);

        return {
            message: 'Workspace join request notification processed',
            result,
        };
    }

    async processWorkspaceJoinAccepted(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        data: INotificationWorkspaceJoinAcceptedPayload
    ): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping workspace join accepted notification',
            };
        }

        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!notification) {
            return {
                message:
                    'Notification not found, skipping workspace join accepted notification',
            };
        }

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: {
                username,
                workspaceName: data.workspaceName,
            },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.allSettled([
            this.notificationPushQueue.sendCleanupTokens(
                userId,
                result.failureTokens
            ),
            this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                result.failureTokens
            ),
        ]);

        return {
            message: 'Workspace join accepted notification processed',
            result,
        };
    }

    async processWorkspaceJoinRejected(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        data: INotificationWorkspaceJoinRejectedPayload
    ): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping workspace join rejected notification',
            };
        }

        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!notification) {
            return {
                message:
                    'Notification not found, skipping workspace join rejected notification',
            };
        }

        const rejectReasonLabel = this.messageService.setMessage(
            `notification.rejectReason.${data.rejectReasonCode}`
        );

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: {
                username,
                workspaceName: data.workspaceName,
                rejectReasonLabel,
            },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.allSettled([
            this.notificationPushQueue.sendCleanupTokens(
                userId,
                result.failureTokens
            ),
            this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                result.failureTokens
            ),
        ]);

        return {
            message: 'Workspace join rejected notification processed',
            result,
        };
    }
}

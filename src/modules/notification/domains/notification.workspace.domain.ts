import { DatabaseUtil } from '@common/database/utils/database.util';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailSendPayload,
    INotificationSendPushPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Writes and fans out the workspace invite and join-request notifications. */
@Injectable()
export class NotificationWorkspaceDomain {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly userDomain: UserDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly notificationPushQueue: NotificationPushQueue
    ) {}

    async processWorkspaceInvite(
        userId: string,
        proceedBy: string,
        data: INotificationWorkspaceInviteEncryptedPayload
    ): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userDomain.getOneActive(userId),
            this.deviceDomain.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping workspace invite notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const promises = [
            this.notificationRepository.create(
                EnumNotificationKind.workspaceInvite,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        workspaceId: data.workspaceId,
                        workspaceName: data.workspaceName,
                        inviterName: data.inviterName,
                    },
                    createdBy: proceedBy,
                }
            ),
            this.notificationEmailQueue.sendWorkspaceInvite(emailPayload, data),
        ];

        if (devices.length > 0) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
            };

            const pushSent = this.notificationPushQueue.sendWorkspaceInvite(
                pushPayload,
                {
                    workspaceId: data.workspaceId,
                    workspaceName: data.workspaceName,
                    inviterName: data.inviterName,
                    workspaceRoleName: data.workspaceRoleName,
                    reference: data.reference,
                    expiredAt: data.expiredAt,
                }
            );
            promises.push(pushSent);
        }

        const results = await Promise.allSettled(promises);

        return { message: 'Workspace invite notification processed', results };
    }

    async processWorkspaceJoinRequest(
        userId: string,
        proceedBy: string,
        data: INotificationWorkspaceJoinRequestEncryptedPayload
    ): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userDomain.getOneActive(userId),
            this.deviceDomain.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping workspace join request notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const promises = [
            this.notificationRepository.create(
                EnumNotificationKind.workspaceJoinRequest,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        workspaceId: data.workspaceId,
                        workspaceName: data.workspaceName,
                        requesterName: data.requesterName,
                    },
                    createdBy: proceedBy,
                }
            ),
            this.notificationEmailQueue.sendWorkspaceJoinRequest(
                emailPayload,
                data
            ),
        ];

        if (devices.length > 0) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
            };

            const pushSent =
                this.notificationPushQueue.sendWorkspaceJoinRequest(
                    pushPayload,
                    {
                        workspaceId: data.workspaceId,
                        workspaceName: data.workspaceName,
                        requesterName: data.requesterName,
                    }
                );
            promises.push(pushSent);
        }

        const results = await Promise.allSettled(promises);

        return {
            message: 'Workspace join request notification processed',
            results,
        };
    }

    async processWorkspaceJoinAccepted(
        userId: string,
        proceedBy: string,
        data: INotificationWorkspaceJoinAcceptedPayload
    ): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userDomain.getOneActive(userId),
            this.deviceDomain.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping workspace join accepted notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const promises = [
            this.notificationRepository.create(
                EnumNotificationKind.workspaceJoinAccepted,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        workspaceId: data.workspaceId,
                        workspaceName: data.workspaceName,
                    },
                    createdBy: proceedBy,
                }
            ),
            this.notificationEmailQueue.sendWorkspaceJoinAccepted(
                emailPayload,
                data
            ),
        ];

        if (devices.length > 0) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
            };

            const pushSent =
                this.notificationPushQueue.sendWorkspaceJoinAccepted(
                    pushPayload,
                    data
                );
            promises.push(pushSent);
        }

        const results = await Promise.allSettled(promises);

        return {
            message: 'Workspace join accepted notification processed',
            results,
        };
    }

    async processWorkspaceJoinRejected(
        userId: string,
        proceedBy: string,
        data: INotificationWorkspaceJoinRejectedPayload
    ): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userDomain.getOneActive(userId),
            this.deviceDomain.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping workspace join rejected notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const promises = [
            this.notificationRepository.create(
                EnumNotificationKind.workspaceJoinRejected,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        workspaceId: data.workspaceId,
                        workspaceName: data.workspaceName,
                        rejectReasonCode: data.rejectReasonCode,
                    },
                    createdBy: proceedBy,
                }
            ),
            this.notificationEmailQueue.sendWorkspaceJoinRejected(
                emailPayload,
                data
            ),
        ];

        if (devices.length > 0) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
            };

            const pushSent =
                this.notificationPushQueue.sendWorkspaceJoinRejected(
                    pushPayload,
                    data
                );
            promises.push(pushSent);
        }

        const results = await Promise.allSettled(promises);

        return {
            message: 'Workspace join rejected notification processed',
            results,
        };
    }
}

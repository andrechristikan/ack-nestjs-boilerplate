import { DatabaseUtil } from '@common/database/utils/database.util';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import {
    INotificationEmailSendPayload,
    INotificationSendPushPayload,
    INotificationWorkspaceInvitePayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPayload,
} from '@modules/notification/interfaces/notification.interface';
import { INotificationWorkspaceService } from '@modules/notification/interfaces/notification.workspace.service.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailUtil } from '@modules/notification/utils/notification.email.util';
import { NotificationPushUtil } from '@modules/notification/utils/notification.push.util';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { Injectable } from '@nestjs/common';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Writes and fans out the workspace invite and join-request notifications. */
@Injectable()
export class NotificationWorkspaceService implements INotificationWorkspaceService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly userRepository: UserRepository,
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationEmailUtil: NotificationEmailUtil,
        private readonly notificationPushUtil: NotificationPushUtil
    ) {}

    async processWorkspaceInvite(
        userId: string,
        proceedBy: string,
        data: INotificationWorkspaceInvitePayload
    ): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userRepository.findOneActiveById(userId),
            this.deviceOwnershipRepository.findTokensByUserId(userId),
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
            this.notificationEmailUtil.sendWorkspaceInvite(emailPayload, data),
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

            promises.push(
                this.notificationPushUtil.sendWorkspaceInvite(pushPayload, data)
            );
        }

        const results = await Promise.allSettled(promises);

        return { message: 'Workspace invite notification processed', results };
    }

    async processWorkspaceJoinRequest(
        userId: string,
        proceedBy: string,
        data: INotificationWorkspaceJoinRequestPayload
    ): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userRepository.findOneActiveById(userId),
            this.deviceOwnershipRepository.findTokensByUserId(userId),
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
            this.notificationEmailUtil.sendWorkspaceJoinRequest(
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

            promises.push(
                this.notificationPushUtil.sendWorkspaceJoinRequest(
                    pushPayload,
                    data
                )
            );
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
            this.userRepository.findOneActiveById(userId),
            this.deviceOwnershipRepository.findTokensByUserId(userId),
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
            this.notificationEmailUtil.sendWorkspaceJoinAccepted(
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

            promises.push(
                this.notificationPushUtil.sendWorkspaceJoinAccepted(
                    pushPayload,
                    data
                )
            );
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
            this.userRepository.findOneActiveById(userId),
            this.deviceOwnershipRepository.findTokensByUserId(userId),
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
            this.notificationEmailUtil.sendWorkspaceJoinRejected(
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

            promises.push(
                this.notificationPushUtil.sendWorkspaceJoinRejected(
                    pushPayload,
                    data
                )
            );
        }

        const results = await Promise.allSettled(promises);

        return {
            message: 'Workspace join rejected notification processed',
            results,
        };
    }
}

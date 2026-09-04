import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewDeviceLoginPayload,
    INotificationPushCleanupTokenQueuePayload,
    INotificationPushQueuePayload,
    INotificationTemporaryPasswordPayload,
    INotificationWorkspaceInvitePayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPayload,
} from '@modules/notification/interfaces/notification.interface';
import { INotificationPushProcessorService } from '@modules/notification/interfaces/notification.push.processor.service.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationPushUtil } from '@modules/notification/utils/notification.push.util';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationPushProcessorService
    implements INotificationPushProcessorService, OnModuleInit
{
    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly notificationRepository: NotificationRepository,
        private readonly messageService: MessageService,
        private readonly helperDateService: HelperDateService,
        private readonly requestContextService: RequestContextService,
        private readonly notificationPushUtil: NotificationPushUtil,
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository
    ) {}

    async onModuleInit(): Promise<void> {
        await this.notificationPushUtil.sendCleanupStaleTokens();
    }

    async processNewDeviceLogin({
        data: {
            send: { notificationTokens, username, notificationId, userId },
            data,
        },
    }: Job<
        INotificationPushQueuePayload<INotificationNewDeviceLoginPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping new login notification',
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
                    'Notification not found, skipping new login notification',
            };
        }

        const device = this.requestContextService.resolveDevice(
            data!.requestLog.userAgent
        );
        const city = this.requestContextService.resolveCity(
            data!.requestLog.geoLocation ?? undefined
        );
        const loginAt = this.helperDateService.formatToRFC2822(
            this.helperDateService.createFromIso(data!.loginAt)
        );
        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: { device, city, username, loginAt },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.allSettled([
            this.notificationPushUtil.sendCleanupTokens(
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
            message: 'New login notification processed',
            result,
        };
    }

    async processResetTwoFactorByAdmin({
        data: {
            send: { notificationTokens, username, notificationId, userId },
        },
    }: Job<
        INotificationPushQueuePayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping reset two-factor notification',
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
                    'Notification not found, skipping reset two-factor notification',
            };
        }

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: { username },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.all([
            this.notificationPushUtil.sendCleanupTokens(
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
            message: 'Reset two-factor notification processed',
            result,
        };
    }

    async processTemporaryPasswordByAdmin({
        data: {
            send: { notificationTokens, username, notificationId, userId },
            data,
        },
    }: Job<
        INotificationPushQueuePayload<INotificationTemporaryPasswordPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping temporary password notification',
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
                    'Notification not found, skipping temporary password notification',
            };
        }

        const passwordExpiredAt = this.helperDateService.formatToRFC2822(
            this.helperDateService.createFromIso(data!.passwordExpiredAt)
        );

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: { username, passwordExpiredAt },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.all([
            this.notificationPushUtil.sendCleanupTokens(
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
            message: 'Temporary password notification processed',
            result,
        };
    }

    async processResetPassword({
        data: {
            send: { notificationTokens, username, notificationId, userId },
        },
    }: Job<
        INotificationPushQueuePayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping reset password notification',
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
                    'Notification not found, skipping reset password notification',
            };
        }

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: { username },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.all([
            this.notificationPushUtil.sendCleanupTokens(
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
            message: 'Reset password notification processed',
            result,
        };
    }

    async processForgotPassword({
        data: {
            send: { notificationTokens, username, notificationId, userId },
        },
    }: Job<
        INotificationPushQueuePayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping forgot password notification',
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
                    'Notification not found, skipping forgot password notification',
            };
        }

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: { username },
        });

        const result = await this.firebaseService.sendMulticast(
            notificationTokens,
            {
                title,
                body,
            }
        );

        await Promise.all([
            this.notificationPushUtil.sendCleanupTokens(
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
            message: 'Forgot password notification processed',
            result,
        };
    }

    async processWorkspaceInvite({
        data: {
            send: { notificationTokens, username, notificationId, userId },
            data,
        },
    }: Job<
        INotificationPushQueuePayload<INotificationWorkspaceInvitePayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
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
                workspaceName: data!.workspaceName,
                inviterName: data!.inviterName,
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
            this.notificationPushUtil.sendCleanupTokens(
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

    async processWorkspaceJoinRequest({
        data: {
            send: { notificationTokens, username, notificationId, userId },
            data,
        },
    }: Job<
        INotificationPushQueuePayload<INotificationWorkspaceJoinRequestPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
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
                workspaceName: data!.workspaceName,
                requesterName: data!.requesterName,
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
            this.notificationPushUtil.sendCleanupTokens(
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

    async processWorkspaceJoinAccepted({
        data: {
            send: { notificationTokens, username, notificationId, userId },
            data,
        },
    }: Job<
        INotificationPushQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
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
                workspaceName: data!.workspaceName,
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
            this.notificationPushUtil.sendCleanupTokens(
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

    async processWorkspaceJoinRejected({
        data: {
            send: { notificationTokens, username, notificationId, userId },
            data,
        },
    }: Job<
        INotificationPushQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
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
            `notification.rejectReason.${data!.rejectReasonCode}`
        );

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: {
                username,
                workspaceName: data!.workspaceName,
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
            this.notificationPushUtil.sendCleanupTokens(
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

    async processCleanupTokens({
        data: {
            data: { userId, failureTokens },
        },
    }: Job<
        INotificationPushCleanupTokenQueuePayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        const result = await this.deviceOwnershipRepository.cleanupTokens(
            userId,
            failureTokens
        );

        return {
            message: `Processed token cleanup for invalid tokens`,
            countRequestedTokens: failureTokens.length,
            countRemovedTokens: result.count,
        };
    }

    async processCleanupStaleTokens(): Promise<IQueueResponse> {
        const staleTokens =
            await this.deviceOwnershipRepository.cleanupStaleTokens();

        return {
            message: `Processed stale token cleanup`,
            countRemovedTokens: staleTokens.count,
        };
    }
}

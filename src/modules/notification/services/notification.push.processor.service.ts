import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperService } from '@common/helper/services/helper.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewDeviceLoginPayload,
    INotificationPushWorkerCleanupTokenPayload,
    INotificationPushWorkerPayload,
    INotificationTenantInviteEmailPayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { INotificationPushProcessorService } from '@modules/notification/interfaces/notification.push.processor.service.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationPushUtil } from '@modules/notification/utils/notification.push.util';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

@Injectable()
export class NotificationPushProcessorService
    implements INotificationPushProcessorService, OnModuleInit
{
    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly notificationRepository: NotificationRepository,
        private readonly messageService: MessageService,
        private readonly helperService: HelperService,
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
        INotificationPushWorkerPayload<INotificationNewDeviceLoginPayload>,
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

        const device = this.helperService.resolveDevice(
            data.requestLog.userAgent
        );
        const city = this.helperService.resolveCity(
            data.requestLog.geoLocation
        );
        const loginAt = this.helperService.dateFormatToRFC2822(
            this.helperService.dateCreateFromIso(data.loginAt)
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
        INotificationPushWorkerPayload,
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
        INotificationPushWorkerPayload<INotificationTemporaryPasswordPayload>,
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

        const passwordExpiredAt = this.helperService.dateFormatToRFC2822(
            this.helperService.dateCreateFromIso(data.passwordExpiredAt)
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
        INotificationPushWorkerPayload,
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

    async processTenantInvite({
        data: {
            send: { notificationTokens, username, notificationId, userId },
            data,
        },
    }: Job<
        INotificationPushWorkerPayload<INotificationTenantInviteEmailPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitialized()) {
            return {
                message:
                    'Firebase not initialized, skipping tenant invite notification',
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
                    'Notification not found, skipping tenant invite notification',
            };
        }

        const title = this.messageService.setMessage(notification.title);
        const body = this.messageService.setMessage(notification.body, {
            properties: { username, tenantName: data.tenantName, role: data.role },
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
            message: 'Tenant invite notification processed',
            result,
        };
    }

    async processForgotPassword({
        data: {
            send: { notificationTokens, username, notificationId, userId },
        },
    }: Job<
        INotificationPushWorkerPayload,
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

    async processCleanupTokens({
        data: {
            data: { userId, failureTokens },
        },
    }: Job<
        INotificationPushWorkerCleanupTokenPayload,
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

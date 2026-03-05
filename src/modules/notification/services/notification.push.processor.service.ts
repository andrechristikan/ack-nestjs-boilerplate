import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperService } from '@common/helper/services/helper.service';
import { MessageService } from '@common/message/services/message.service';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewDeviceLoginPayload,
    INotificationPushWorkerCleanupTokenPayload,
    INotificationPushWorkerPayload,
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
        private readonly deviceRepository: DeviceRepository
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

        const notification = await this.notificationRepository.findOneByUserId(
            userId,
            notificationId
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
        const loginAt = this.helperService.dateFormatToRFC2822(data.loginAt);
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

        await this.notificationPushUtil.sendCleanupTokens(
            userId,
            result.invalidTokens
        );

        return {
            message: 'New login notification processed',
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

        const notification = await this.notificationRepository.findOneByUserId(
            userId,
            notificationId
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

        await this.notificationPushUtil.sendCleanupTokens(
            userId,
            result.invalidTokens
        );

        return {
            message: 'Reset two-factor notification processed',
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

        const notification = await this.notificationRepository.findOneByUserId(
            userId,
            notificationId
        );
        if (!notification) {
            return {
                message:
                    'Notification not found, skipping temporary password notification',
            };
        }

        const passwordExpiredAt = this.helperService.dateFormatToRFC2822(
            data.passwordExpiredAt
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

        await this.notificationPushUtil.sendCleanupTokens(
            userId,
            result.invalidTokens
        );

        return {
            message: 'Temporary password notification processed',
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

        const notification = await this.notificationRepository.findOneByUserId(
            userId,
            notificationId
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

        await this.notificationPushUtil.sendCleanupTokens(
            userId,
            result.invalidTokens
        );

        return {
            message: 'Reset password notification processed',
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

        const notification = await this.notificationRepository.findOneByUserId(
            userId,
            notificationId
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

        await this.notificationPushUtil.sendCleanupTokens(
            userId,
            result.invalidTokens
        );

        return {
            message: 'Forgot password notification processed',
        };
    }

    async processCleanupTokens({
        data: {
            data: { userId, invalidTokens },
        },
    }: Job<
        INotificationPushWorkerCleanupTokenPayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        const result = await this.deviceRepository.cleanupTokensByIds(
            userId,
            invalidTokens
        );

        return {
            message: `Processed token cleanup for invalid tokens`,
            countRequestedTokens: invalidTokens.length,
            countRemovedTokens: result.count,
        };
    }

    async processCleanupStaleTokens(): Promise<IQueueResponse> {
        const staleTokens = await this.deviceRepository.cleanupStaleTokens();

        return {
            message: `Processed stale token cleanup`,
            countRemovedTokens: staleTokens.count,
        };
    }
}

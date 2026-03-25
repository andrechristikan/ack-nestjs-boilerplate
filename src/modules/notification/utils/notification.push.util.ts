import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewDeviceLoginPayload,
    INotificationPushWorkerCleanupTokenPayload,
    INotificationPushWorkerPayload,
    INotificationSendPushPayload,
    INotificationTemporaryPasswordPayload,
    INotificationTenantInviteEmailPayload,
} from '@modules/notification/interfaces/notification.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from 'src/queues/enums/queue.enum';

/**
 * Utility for queueing push notification jobs to Firebase Cloud Messaging.
 * Enqueues various push notification types (alerts, resets, device login) with rate limiting.
 */
@Injectable()
export class NotificationPushUtil {
    private readonly defTz: string;

    constructor(
        @InjectQueue(EnumQueue.notificationPush)
        private readonly notificationPushQueue: Queue,
        private readonly configService: ConfigService
    ) {
        this.defTz = this.configService.get<string>('app.timezone');
    }

    /**
     * Enqueues a temporary password push notification sent by admin.
     *
     * @param sendPayload - User to notify (userId, fcmTokens, username)
     * @param data - Temporary password data (password, created/expiry dates)
     * @returns Promise resolving when job is enqueued
     */
    async sendTemporaryPasswordByAdmin(
        sendPayload: INotificationSendPushPayload,
        data: INotificationTemporaryPasswordPayload
    ): Promise<void> {
        const payload: INotificationPushWorkerPayload = {
            send: sendPayload,
            data,
        };

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.temporaryPasswordByAdmin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationPushProcess.temporaryPasswordByAdmin}-${sendPayload.userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /**
     * Enqueues a password reset push notification.
     *
     * @param sendPayload - User to notify (userId, fcmTokens, username)
     * @returns Promise resolving when job is enqueued
     */
    async sendResetPassword(
        sendPayload: INotificationSendPushPayload
    ): Promise<void> {
        const payload: INotificationPushWorkerPayload = {
            send: sendPayload,
        };

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.resetPassword,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationPushProcess.resetPassword}-${sendPayload.userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /**
     * Enqueues a 2FA reset push notification sent by admin.
     *
     * @param sendPayload - User to notify (userId, fcmTokens, username)
     * @returns Promise resolving when job is enqueued
     */
    async sendResetTwoFactorByAdmin(
        sendPayload: INotificationSendPushPayload
    ): Promise<void> {
        const payload: INotificationPushWorkerPayload = {
            send: sendPayload,
        };

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.resetTwoFactorByAdmin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationPushProcess.resetTwoFactorByAdmin}-${sendPayload.userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /**
     * Enqueues a new device login alert push notification.
     *
     * @param sendPayload - User to notify (userId, fcmTokens, username)
     * @param data - Login details (device, IP, location, time)
     * @returns Promise resolving when job is enqueued
     */
    async sendNewDeviceLogin(
        sendPayload: INotificationSendPushPayload,
        data: INotificationNewDeviceLoginPayload
    ): Promise<void> {
        const payload: INotificationPushWorkerPayload<INotificationNewDeviceLoginPayload> =
            {
                send: sendPayload,
                data,
            };

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.newDeviceLogin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationPushProcess.newDeviceLogin}-${sendPayload.userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /**
     * Enqueues a tenant invite push notification.
     *
     * @param sendPayload - User to notify (userId, fcmTokens, username)
     * @param data - Tenant invite payload
     * @returns Promise resolving when job is enqueued
     */
    async sendTenantInvite(
        sendPayload: INotificationSendPushPayload,
        data: INotificationTenantInviteEmailPayload
    ): Promise<void> {
        const payload: INotificationPushWorkerPayload<INotificationTenantInviteEmailPayload> =
            {
                send: sendPayload,
                data,
            };

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.tenantInvite,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationPushProcess.tenantInvite}-${sendPayload.userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    /**
     * Enqueues a cleanup job for invalid FCM tokens.
     * Only enqueues if there are failure tokens to cleanup.
     *
     * @param userId - The user whose tokens failed
     * @param failureTokens - Array of invalid FCM tokens to remove
     * @returns Promise resolving when job is enqueued or if no tokens to cleanup
     */
    async sendCleanupTokens(
        userId: string,
        failureTokens: string[]
    ): Promise<void> {
        if (failureTokens.length > 0) {
            const payload: INotificationPushWorkerCleanupTokenPayload = {
                data: { failureTokens, userId },
            };

            await this.notificationPushQueue.add(
                EnumNotificationPushProcess.cleanupTokens,
                payload,
                {
                    priority: EnumQueuePriority.low,
                    deduplication: {
                        id: `${EnumNotificationPushProcess.cleanupTokens}-${userId}`,
                        ttl: 1000 * 60 * 60, // 1 hour
                    },
                }
            );
        }
    }

    /**
     * Enqueues a daily cleanup job for stale/expired FCM tokens.
     * Runs as a cron job daily at midnight in the configured timezone.
     *
     * @returns Promise resolving when recurring job is scheduled
     */
    async sendCleanupStaleTokens(): Promise<void> {
        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.cleanupStaleTokens,
            {},
            {
                priority: EnumQueuePriority.low,
                repeat: {
                    pattern: '0 0 * * *',
                    tz: this.defTz,
                },
            }
        );
    }
}

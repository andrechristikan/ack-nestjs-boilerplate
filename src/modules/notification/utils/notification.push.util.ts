import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewDeviceLoginPayload,
    INotificationPushWorkerCleanupTokenPayload,
    INotificationPushWorkerPayload,
    INotificationSendPushPayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

/**
 * Enqueues push notification jobs (FCM) onto the push queue, deduplicated per user.
 */
@Injectable()
export class NotificationPushUtil {
    private readonly defTz: string;

    constructor(
        @InjectQueue(EnumQueue.notificationPush)
        private readonly notificationPushQueue: Queue,
        private readonly configService: ConfigService
    ) {
        this.defTz = this.configService.get<string>('app.timezone')!;
    }

    /** Enqueues the admin-issued temporary password push. */
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

    /** Enqueues the password reset confirmation push. */
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

    /** Enqueues the admin-triggered two-factor reset push. */
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

    /** Enqueues the new-device login alert push. */
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

    /** Enqueues removal of invalid FCM tokens; no-op when there are no failures, deduplicated for 1 hour per user. */
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
                        ttl: 1000 * 60 * 60,
                    },
                }
            );
        }
    }

    /** Schedules the recurring stale-token cleanup (daily at midnight in the configured timezone). */
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

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
import { EnumQueue, EnumQueuePriority } from 'src/queues/enums/queue.enum';

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

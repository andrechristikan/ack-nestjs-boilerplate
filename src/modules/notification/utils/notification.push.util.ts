import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPushWorkerPayload,
    INotificationSendPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from 'src/queues/enums/queue.enum';

@Injectable()
export class NotificationPushUtil {
    constructor(
        @InjectQueue(EnumQueue.notificationPush)
        private readonly notificationPushQueue: Queue
    ) {}

    async sendTemporaryPasswordByAdmin(
        sendPayload: INotificationSendPushPayload
    ): Promise<void> {
        const payload: INotificationPushWorkerPayload = {
            send: sendPayload,
        };

        await this.notificationPushQueue.add(
            EnumNotificationProcess.temporaryPasswordByAdmin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationProcess.temporaryPasswordByAdmin}-${sendPayload.userId}`,
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
            EnumNotificationProcess.resetPassword,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: `${EnumNotificationProcess.resetPassword}-${sendPayload.userId}`,
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
            EnumNotificationProcess.resetTwoFactorByAdmin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationProcess.resetTwoFactorByAdmin}-${sendPayload.userId}`,
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
            EnumNotificationProcess.newDeviceLogin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationProcess.newDeviceLogin}-${sendPayload.userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    async sendForgotPassword(
        sendPayload: INotificationSendPushPayload
    ): Promise<void> {
        const payload: INotificationPushWorkerPayload = {
            send: sendPayload,
        };

        await this.notificationPushQueue.add(
            EnumNotificationProcess.forgotPassword,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationProcess.forgotPassword}-${sendPayload.userId}`,
                    ttl: 1000,
                },
            }
        );
    }
}

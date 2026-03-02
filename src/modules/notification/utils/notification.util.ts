import {
    Notification,
    NotificationUserSetting,
} from '@generated/prisma-client';
import { NotificationUserSettingDto } from '@modules/notification/dtos/notification.user-setting.dto';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewDeviceLoginPayload,
    INotificationSendPushPayload,
    INotificationWorkerPayload,
} from '@modules/notification/interfaces/notification.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { EnumQueue, EnumQueuePriority } from 'src/queues/enums/queue.enum';

@Injectable()
export class NotificationUtil {
    constructor(
        @InjectQueue(EnumQueue.notification)
        private readonly notificationQueue: Queue
    ) {}

    async sendPushNewDeviceLogin(
        send: INotificationSendPushPayload,
        payload: INotificationNewDeviceLoginPayload
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.newDeviceLogin,
            {
                send,
                data: payload,
            } as INotificationWorkerPayload<INotificationNewDeviceLoginPayload>,
            {
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendPushTemporaryPasswordByAdmin(
        send: INotificationSendPushPayload
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.temporaryPasswordByAdmin,
            {
                send,
            } as INotificationWorkerPayload,
            {
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendPushResetTwoFactorByAdmin(
        send: INotificationSendPushPayload
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.resetTwoFactorByAdmin,
            {
                send,
            } as INotificationWorkerPayload,
            {
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendPushResetPassword(
        send: INotificationSendPushPayload
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.resetPassword,
            {
                send,
            } as INotificationWorkerPayload,
            {
                priority: EnumQueuePriority.high,
            }
        );
    }

    mapList(notifications: Notification[]): NotificationResponseDto[] {
        return plainToInstance(NotificationResponseDto, notifications);
    }

    mapUserSettingList(
        settings: NotificationUserSetting[]
    ): NotificationUserSettingDto[] {
        return plainToInstance(NotificationUserSettingDto, settings);
    }
}

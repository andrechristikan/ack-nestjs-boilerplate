import { Notification } from '@generated/prisma-client';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewLoginPayload,
    INotificationSendPayload,
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

    async sendNewLogin(
        send: INotificationSendPayload,
        payload: INotificationNewLoginPayload
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.newLogin,
            {
                send,
                data: payload,
            } as INotificationWorkerPayload<INotificationNewLoginPayload>,
            {
                priority: EnumQueuePriority.high,
            }
        );
    }

    mapList(notifications: Notification[]): NotificationResponseDto[] {
        return plainToInstance(NotificationResponseDto, notifications);
    }

    // TODO:  see notification module
}

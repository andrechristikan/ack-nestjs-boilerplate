import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { Injectable } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';

@Injectable()
export class NotificationPushDeliveryDomain {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly messageService: MessageService,
        private readonly helperDateService: HelperDateService
    ) {}

    private throwDeliveryNotFound(process: EnumNotificationPushProcess): never {
        const message = this.messageService.setMessage(
            'notification.queue.push.error.deliveryNotFound',
            { properties: { process } }
        );

        throw new UnrecoverableError(message);
    }

    async stampProcessed(
        notificationId: string,
        process: EnumNotificationPushProcess
    ): Promise<void> {
        const processedAt = this.helperDateService.create();
        const stamped =
            await this.notificationRepository.updateDeliveryProcessedAt(
                notificationId,
                EnumNotificationChannel.push,
                processedAt
            );
        if (!stamped) {
            this.throwDeliveryNotFound(process);
        }
    }

    async stampSent(
        notificationId: string,
        failureTokens: string[],
        process: EnumNotificationPushProcess
    ): Promise<void> {
        const sentAt = this.helperDateService.create();
        const stamped = await this.notificationRepository.updateDeliverySentAt(
            notificationId,
            EnumNotificationChannel.push,
            sentAt,
            failureTokens
        );
        if (!stamped) {
            this.throwDeliveryNotFound(process);
        }
    }
}

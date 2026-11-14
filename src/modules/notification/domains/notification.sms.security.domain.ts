import { Injectable } from '@nestjs/common';
import { AwsSNSService } from '@common/aws/services/aws.sns.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import type { INotificationSendSmsPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationSmsSecurityDomain {
    constructor(
        private readonly awsSNSService: AwsSNSService,
        private readonly messageService: MessageService,
        private readonly notificationRepository: NotificationRepository
    ) {}

    async process({
        userId,
        notificationId,
        kind,
        phoneNumber,
    }: INotificationSendSmsPayload): Promise<IQueueResponse> {
        const initialized = this.awsSNSService.isInitialized();
        if (!initialized || !phoneNumber) {
            return { message: 'SMS notification skipped' };
        }

        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.sms
        );
        if (!notification) {
            return {
                message: 'Notification not found, skipping SMS notification',
            };
        }

        const body = this.messageService.setMessage(`notification.sms.${kind}`);
        const result = await this.awsSNSService.sendSms({
            phoneNumber,
            message: body,
        });

        await this.notificationRepository.updateSentAt(
            userId,
            notificationId,
            EnumNotificationChannel.sms,
            []
        );

        return { message: 'SMS notification processed', result };
    }
}

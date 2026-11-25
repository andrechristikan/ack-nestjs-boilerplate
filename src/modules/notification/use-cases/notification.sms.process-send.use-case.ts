import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { MessageService } from '@common/message/services/message.service';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import type { INotificationSmsSendPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationSmsDeliveryService } from '@modules/notification/services/notification.sms.delivery.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationSmsProcessSendUseCase implements IAppUseCase<
    [string, INotificationSmsSendPayload],
    IQueueResponse
> {
    constructor(
        private readonly notificationSmsDeliveryService: NotificationSmsDeliveryService,
        private readonly notificationUtil: NotificationUtil,
        private readonly outboxService: OutboxService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        outboxId: string,
        payload: INotificationSmsSendPayload
    ): Promise<IQueueResponse> {
        const {
            kind,
            notificationId,
            userId,
            username,
            encryptedMobileNumber,
            context,
            completedSteps,
        } = payload;
        if (!completedSteps.includes(EnumNotificationStep.sendSms)) {
            // Sequential by design: side effects whose order is part of the contract (processedAt before the send, the step recorded after its success, sentAt last)
            await this.notificationSmsDeliveryService.stampProcessed(
                notificationId,
                context.proceedBy
            );
            const mobileNumber = this.notificationUtil.decryptPayload(
                encryptedMobileNumber,
                userId
            );
            const opened = this.notificationUtil.openContext(
                kind,
                context,
                userId
            );
            const templateData = this.notificationUtil.toTemplateData(
                kind,
                opened,
                username
            );
            const body = this.messageService.setMessage(
                `notification.sms.${kind}`,
                { properties: templateData }
            );
            await this.notificationSmsDeliveryService.send(
                kind,
                mobileNumber,
                body
            );
            await this.outboxService.replaceData(outboxId, {
                ...payload,
                completedSteps: [EnumNotificationStep.sendSms],
            });
        }

        await this.notificationSmsDeliveryService.stampSent(
            notificationId,
            context.proceedBy
        );

        const message = this.messageService.setMessage(
            'notification.queue.sms.send',
            { properties: { process: kind } }
        );

        return { message };
    }
}

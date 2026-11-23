import type { SendTemplatedEmailCommandOutput } from '@aws-sdk/client-ses';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { MessageService } from '@common/message/services/message.service';
import type { INotificationEmailSendQueueResponse } from '@modules/notification/interfaces/notification.interface';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import type { INotificationEmailSendPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailDeliveryService } from '@modules/notification/services/notification.email.delivery.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationEmailProcessSendUseCase implements IAppUseCase<
    [string, INotificationEmailSendPayload],
    INotificationEmailSendQueueResponse
> {
    constructor(
        private readonly awsSesService: AwsSesService,
        private readonly notificationEmailDeliveryService: NotificationEmailDeliveryService,
        private readonly notificationUtil: NotificationUtil,
        private readonly outboxService: OutboxService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        outboxId: string,
        {
            kind,
            notificationId,
            userId,
            username,
            encryptedEmail,
            context,
            completedSteps,
        }: INotificationEmailSendPayload
    ): Promise<INotificationEmailSendQueueResponse> {
        const isInitialized = this.awsSesService.isInitialized();
        if (!isInitialized) {
            const message = this.messageService.setMessage(
                'notification.queue.email.error.sesNotInitialized'
            );

            return { message, result: null };
        }

        let result: SendTemplatedEmailCommandOutput | null = null;
        if (!completedSteps.includes(EnumNotificationStep.sendEmail)) {
            // Sequential by design: side effects whose order is part of the contract (processedAt before the SES call, the step recorded after its success, sentAt last)
            await this.notificationEmailDeliveryService.stampProcessed(
                notificationId,
                context.proceedBy
            );
            const email = this.notificationUtil.decryptPayload(
                encryptedEmail,
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
            result = await this.notificationEmailDeliveryService.send(
                kind,
                email,
                templateData
            );
            await this.outboxService.updateData(outboxId, {
                completedSteps: [EnumNotificationStep.sendEmail],
            });
        }

        await this.notificationEmailDeliveryService.stampSent(
            notificationId,
            context.proceedBy
        );

        const message = this.messageService.setMessage(
            'notification.queue.email.send',
            { properties: { process: kind } }
        );

        return { message, result };
    }
}

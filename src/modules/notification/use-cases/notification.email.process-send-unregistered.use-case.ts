import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { MessageService } from '@common/message/services/message.service';
import type { INotificationEmailSendUnregisteredQueueResponse } from '@modules/notification/interfaces/notification.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationEmailSendUnregisteredPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailDeliveryService } from '@modules/notification/services/notification.email.delivery.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationEmailProcessSendUnregisteredUseCase implements IAppUseCase<
    [INotificationEmailSendUnregisteredPayload],
    INotificationEmailSendUnregisteredQueueResponse
> {
    constructor(
        private readonly awsSesService: AwsSesService,
        private readonly notificationEmailDeliveryService: NotificationEmailDeliveryService,
        private readonly notificationUtil: NotificationUtil,
        private readonly messageService: MessageService
    ) {}

    async execute({
        encryptedEmail,
        context,
    }: INotificationEmailSendUnregisteredPayload): Promise<INotificationEmailSendUnregisteredQueueResponse> {
        const isInitialized = this.awsSesService.isInitialized();
        if (!isInitialized) {
            const message = this.messageService.setMessage(
                'notification.queue.email.error.sesNotInitialized'
            );

            return { message, result: null };
        }

        const kind = EnumNotificationKind.workspaceInvite;
        const email = this.notificationUtil.decryptPayload(
            encryptedEmail,
            context.reference
        );
        const opened = this.notificationUtil.openContext(
            kind,
            context,
            context.reference
        );
        const templateData = this.notificationUtil.toTemplateData(
            kind,
            opened,
            email
        );
        const result = await this.notificationEmailDeliveryService.send(
            kind,
            email,
            templateData
        );

        const message = this.messageService.setMessage(
            'notification.queue.email.sendUnregistered'
        );

        return { message, result };
    }
}

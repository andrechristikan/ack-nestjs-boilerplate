import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { MessageService } from '@common/message/services/message.service';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationEmailSendUnregisteredPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailDeliveryService } from '@modules/notification/services/notification.email.delivery.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationEmailProcessSendUnregisteredUseCase implements IAppUseCase<
    [INotificationEmailSendUnregisteredPayload],
    IQueueResponse
> {
    constructor(
        private readonly notificationEmailDeliveryService: NotificationEmailDeliveryService,
        private readonly notificationUtil: NotificationUtil,
        private readonly messageService: MessageService
    ) {}

    async execute({
        encryptedEmail,
        context,
    }: INotificationEmailSendUnregisteredPayload): Promise<IQueueResponse> {
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

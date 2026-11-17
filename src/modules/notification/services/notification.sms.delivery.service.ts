import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import type { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationSmsDeliveryService {
    private readonly logger = new Logger(NotificationSmsDeliveryService.name);

    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly helperDateService: HelperDateService
    ) {}

    private maskNumber(number: string): string {
        return `•••${number.slice(-3)}`;
    }

    async stampProcessed(
        notificationId: string,
        proceedBy: string
    ): Promise<void> {
        const processedAt = this.helperDateService.create();
        await this.notificationRepository.updateDeliveryProcessedAt(
            notificationId,
            EnumNotificationChannel.sms,
            processedAt,
            proceedBy
        );
    }

    async stampSent(notificationId: string, proceedBy: string): Promise<void> {
        const sentAt = this.helperDateService.create();
        await this.notificationRepository.updateDeliverySentAt(
            notificationId,
            EnumNotificationChannel.sms,
            sentAt,
            [],
            proceedBy
        );
    }

    /** Logs the kind and the number masked to its last 3 digits, never the body, and returns: no SMS provider is wired. */
    async send(
        kind: EnumNotificationKind,
        to: string,
        _body: string
    ): Promise<void> {
        const masked = this.maskNumber(to);
        this.logger.log(
            { kind, to: masked },
            'SMS delivery has no provider, nothing sent'
        );
    }
}

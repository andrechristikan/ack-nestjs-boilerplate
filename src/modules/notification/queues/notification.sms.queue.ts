import type { INotificationSendSmsPayload } from '@modules/notification/interfaces/notification.interface';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

/**
 * Enqueues security alert SMS jobs, deduplicated per user, kind, and recipient.
 */
@Injectable()
export class NotificationSmsQueue {
    private readonly dedupTtlInMs: number;

    constructor(
        @InjectQueue(EnumQueue.notificationSms)
        private readonly notificationSmsQueue: Queue,
        private readonly configService: ConfigService,
        private readonly helperHashService: HelperHashService
    ) {
        this.dedupTtlInMs = this.configService.get<number>(
            'notification.dedupTtlInMs'
        )!;
    }

    async sendSecurityAlert({
        userId,
        notificationId,
        kind,
        phoneNumber,
    }: INotificationSendSmsPayload): Promise<void> {
        if (!phoneNumber) {
            return;
        }

        const payload: INotificationSendSmsPayload = {
            userId,
            notificationId,
            kind,
            phoneNumber,
        };

        const recipientHash = this.helperHashService.sha256Hash(phoneNumber);
        await this.notificationSmsQueue.add(kind, payload, {
            priority: EnumQueuePriority.high,
            deduplication: {
                id: `${kind}-${userId}-${recipientHash}`,
                ttl: this.dedupTtlInMs,
            },
        });
    }
}

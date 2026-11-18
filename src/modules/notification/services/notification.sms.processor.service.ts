import { EnumNotificationSmsProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationSendSmsPayload,
    INotificationSendSmsVerificationPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationSmsAccountDomain } from '@modules/notification/domains/notification.sms.account.domain';
import { NotificationSmsSecurityDomain } from '@modules/notification/domains/notification.sms.security.domain';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationSmsProcessorService {
    constructor(
        private readonly notificationSmsSecurityDomain: NotificationSmsSecurityDomain,
        private readonly notificationSmsAccountDomain: NotificationSmsAccountDomain
    ) {}

    async processSecurityAlert(
        job: Job<
            INotificationSendSmsPayload,
            IQueueResponse,
            EnumNotificationSmsProcess
        >
    ): Promise<IQueueResponse> {
        const result = await this.notificationSmsSecurityDomain.process(
            job.data
        );

        return result;
    }

    async processVerificationMobileNumber(
        job: Job<
            INotificationSendSmsVerificationPayload,
            IQueueResponse,
            EnumNotificationSmsProcess
        >
    ): Promise<IQueueResponse> {
        const result =
            await this.notificationSmsAccountDomain.processVerificationMobileNumber(
                job.data
            );

        return result;
    }
}

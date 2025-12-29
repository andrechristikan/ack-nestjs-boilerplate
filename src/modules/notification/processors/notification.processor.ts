import { NotificationOutboxJobDto } from '@modules/notification/dtos/notification.outbox-job.dto';
import { NotificationPushJobDto } from '@modules/notification/dtos/notification.push-job.dto';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationOutboxService } from '@modules/notification/services/notification-outbox.service';
import { NotificationPushService } from '@modules/notification/services/notification.push.service';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueProcessorBase } from 'src/queues/bases/queue.processor.base';
import { QueueProcessor } from 'src/queues/decorators/queue.decorator';
import { EnumQueue } from 'src/queues/enums/queue.enum';

@QueueProcessor(EnumQueue.NOTIFICATION)
export class NotificationProcessor extends QueueProcessorBase {
    private readonly logger = new Logger(NotificationProcessor.name);

    constructor(
        private readonly notificationOutboxService: NotificationOutboxService,
        private readonly notificationPushService: NotificationPushService
    ) {
        super();
    }

    async process(
        job: Job<
            | NotificationOutboxJobDto
            | NotificationPushJobDto
            | Record<string, never>,
            unknown,
            string
        >
    ): Promise<void> {
        try {
            switch (job.name) {
                case EnumNotificationProcess.outboxDispatch:
                    await this.notificationOutboxService.dispatchPending();
                    break;
                case EnumNotificationProcess.outboxHandle:
                    await this.notificationOutboxService.handleOutbox(
                        (job.data as NotificationOutboxJobDto).outboxId
                    );
                    break;
                case EnumNotificationProcess.pushLogin:
                    await this.notificationPushService.processLogin(
                        job.data as NotificationPushJobDto
                    );
                    break;
                default:
                    break;
            }
        } catch (error: unknown) {
            this.logger.error(error);
        }
    }
}

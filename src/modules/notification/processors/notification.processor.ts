import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationWorkerPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueProcessorBase } from 'src/queues/bases/queue.processor.base';
import { QueueProcessor } from 'src/queues/decorators/queue.decorator';
import { EnumQueue } from 'src/queues/enums/queue.enum';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

@QueueProcessor(EnumQueue.notification)
export class NotificationProcessor extends QueueProcessorBase {
    private readonly logger = new Logger(NotificationProcessor.name);

    constructor(private readonly notificationUtil: NotificationUtil) {
        super();
    }

    async process(
        job: Job<INotificationWorkerPayload, unknown, string>
    ): Promise<IQueueResponse> {
        try {
            // switch (job.name) {
            // case EnumNotificationProcess.newLogin:
            //     await this.notificationUtil.dispatchPending();
            //     break;
            //                 case EnumNotificationProcess.outboxHandle:
            //                     await this.notificationOutboxService.handleOutbox(
            //                         (job.data as NotificationOutboxJobDto).outboxId
            //                     );
            //                     break;
            //                 case EnumNotificationProcess.pushLogin:
            //                     await this.notificationPushService.processLogin(
            //                         job.data as NotificationPushJobDto
            //                     );
            //                     break;
            //                 case EnumNotificationProcess.cleanupInvalidTokens:
            //                     await this.notificationPushService.processTokenCleanup();
            //                     break;
            //                 default:
            //                     break;
            // }
            return;
        } catch (error: unknown) {
            this.logger.error(error);
        }
    }
}

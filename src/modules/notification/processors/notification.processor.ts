import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewDeviceLoginPayload,
    INotificationWorkerPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueProcessorBase } from 'src/queues/bases/queue.processor.base';
import { QueueProcessor } from 'src/queues/decorators/queue.decorator';
import { EnumQueue } from 'src/queues/enums/queue.enum';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

@QueueProcessor(EnumQueue.notification)
export class NotificationProcessor extends QueueProcessorBase {
    private readonly logger = new Logger(NotificationProcessor.name);

    constructor(
        private readonly notificationProcessorService: NotificationProcessorService
    ) {
        super();
    }

    async process(
        job: Job<INotificationWorkerPayload, unknown, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        try {
            switch (job.name) {
                case EnumNotificationProcess.newDeviceLogin:
                    return this.notificationProcessorService.processNewDeviceLogin(
                        job.data as INotificationWorkerPayload<INotificationNewDeviceLoginPayload>
                    );
                default:
                    return {
                        message:
                            'No notification processor found for the given job name',
                    };
            }
        } catch (error: unknown) {
            this.logger.error(error);
            throw error;
        }
    }
}

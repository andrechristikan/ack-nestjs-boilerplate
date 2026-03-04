import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewDeviceLoginPayload,
    INotificationPushWorkerPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushProcessorService } from '@modules/notification/services/notification.push.processor.service';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueProcessorBase } from 'src/queues/bases/queue.processor.base';
import { QueueProcessor } from 'src/queues/decorators/queue.decorator';
import { EnumQueue } from 'src/queues/enums/queue.enum';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

@QueueProcessor(EnumQueue.notificationPush)
export class NotificationPushProcessor extends QueueProcessorBase {
    private readonly logger = new Logger(NotificationPushProcessor.name);

    constructor(
        private readonly notificationPushProcessorService: NotificationPushProcessorService
    ) {
        super();
    }

    async process(
        job: Job<unknown, IQueueResponse, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        try {
            switch (job.name) {
                case EnumNotificationProcess.newDeviceLogin:
                    return this.notificationPushProcessorService.processNewDeviceLogin(
                        job as Job<
                            INotificationPushWorkerPayload<INotificationNewDeviceLoginPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.resetTwoFactorByAdmin:
                    return this.notificationPushProcessorService.processResetTwoFactorByAdmin(
                        job as Job<
                            INotificationPushWorkerPayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.temporaryPasswordByAdmin:
                    return this.notificationPushProcessorService.processTemporaryPasswordByAdmin(
                        job as Job<
                            INotificationPushWorkerPayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.resetPassword:
                    return this.notificationPushProcessorService.processResetPassword(
                        job as Job<
                            INotificationPushWorkerPayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.forgotPassword:
                    return this.notificationPushProcessorService.processForgotPassword(
                        job as Job<
                            INotificationPushWorkerPayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                default:
                    return {
                        message: `No notification processor found for the given job name ${job.name}`,
                    };
            }
        } catch (error: unknown) {
            this.logger.error(error);
            throw error;
        }
    }
}

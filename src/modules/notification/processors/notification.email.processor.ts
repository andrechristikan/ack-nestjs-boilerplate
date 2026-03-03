import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EnumQueue } from 'src/queues/enums/queue.enum';
import { QueueProcessorBase } from 'src/queues/bases/queue.processor.base';
import { QueueProcessor } from 'src/queues/decorators/queue.decorator';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';
import {
    INotificationEmailWorkerPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
} from '@modules/notification/interfaces/notification.interface';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationEmailProcessorService } from '@modules/notification/services/notification.email.processor.service';

@QueueProcessor(EnumQueue.notificationEmail)
export class NotificationEmailProcessor extends QueueProcessorBase {
    private readonly logger = new Logger(NotificationEmailProcessor.name);

    constructor(
        private readonly notificationEmailProcessorService: NotificationEmailProcessorService
    ) {
        super();
    }

    async process(
        job: Job<
            INotificationEmailWorkerPayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        try {
            const jobName = job.name;
            switch (jobName) {
                case EnumNotificationProcess.changePassword:
                    return this.notificationEmailProcessorService.processChangePassword(
                        job.data.send
                    );

                case EnumNotificationProcess.welcome:
                    return this.notificationEmailProcessorService.processWelcome(
                        job.data.send
                    );

                case EnumNotificationProcess.welcomeByAdmin:
                    return this.notificationEmailProcessorService.processWelcomeByAdmin(
                        job.data.send,
                        job.data.data as INotificationWelcomeByAdminPayload
                    );

                case EnumNotificationProcess.temporaryPasswordByAdmin:
                    return this.notificationEmailProcessorService.processTemporaryPasswordByAdmin(
                        job.data.send,
                        job.data.data as INotificationTemporaryPasswordPayload
                    );

                case EnumNotificationProcess.forgotPassword:
                    return this.notificationEmailProcessorService.processForgotPassword(
                        job.data.send,
                        job.data.data as INotificationForgotPasswordPayload
                    );

                case EnumNotificationProcess.verificationEmail:
                    return this.notificationEmailProcessorService.processVerificationEmail(
                        job.data.send,
                        job.data.data as INotificationVerificationEmailPayload
                    );

                case EnumNotificationProcess.verifiedEmail:
                    return this.notificationEmailProcessorService.processVerifiedEmail(
                        job.data.send,
                        job.data.data as INotificationVerifiedEmailPayload
                    );

                case EnumNotificationProcess.verifiedMobileNumber:
                    return this.notificationEmailProcessorService.processVerifiedMobileNumber(
                        job.data.send,
                        job.data
                            .data as INotificationVerifiedMobileNumberPayload
                    );

                case EnumNotificationProcess.newDeviceLogin:
                    return this.notificationEmailProcessorService.processNewDeviceLogin(
                        job.data.send,
                        job.data.data as INotificationNewDeviceLoginPayload
                    );

                default:
                    return {
                        message:
                            'No email processor found for the given job name',
                    };
            }
        } catch (error: unknown) {
            this.logger.error(error);
            throw error;
        }

        return;
    }
}

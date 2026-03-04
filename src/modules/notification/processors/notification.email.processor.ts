import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EnumQueue } from 'src/queues/enums/queue.enum';
import { QueueProcessorBase } from 'src/queues/bases/queue.processor.base';
import { QueueProcessor } from 'src/queues/decorators/queue.decorator';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';
import {
    INotificationEmailWorkerBulkPayload,
    INotificationEmailWorkerPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
} from '@modules/notification/interfaces/notification.interface';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationEmailProcessorService } from '@modules/notification/services/notification.email.processor.service';
import {
    AwsSESRateLimitDurationInMs,
    AwsSESRateLimitPerDuration,
} from '@common/aws/constants/aws.constant';

@QueueProcessor(EnumQueue.notificationEmail, {
    limiter: {
        max: AwsSESRateLimitPerDuration,
        duration: AwsSESRateLimitDurationInMs,
    },
})
export class NotificationEmailProcessor extends QueueProcessorBase {
    private readonly logger = new Logger(NotificationEmailProcessor.name);

    constructor(
        private readonly notificationEmailProcessorService: NotificationEmailProcessorService
    ) {
        super();
    }

    async process(
        job: Job<unknown, IQueueResponse, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        try {
            const jobName = job.name;
            switch (jobName) {
                case EnumNotificationProcess.changePassword:
                    return this.notificationEmailProcessorService.processChangePassword(
                        job as Job<
                            INotificationEmailWorkerPayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.welcome:
                    return this.notificationEmailProcessorService.processWelcome(
                        job as Job<
                            INotificationEmailWorkerPayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.welcomeSocial:
                    return this.notificationEmailProcessorService.processWelcomeSocial(
                        job as Job<
                            INotificationEmailWorkerPayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.welcomeByAdmin:
                    return this.notificationEmailProcessorService.processWelcomeByAdmin(
                        job as Job<
                            INotificationEmailWorkerPayload<INotificationWelcomeByAdminPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.temporaryPasswordByAdmin:
                    return this.notificationEmailProcessorService.processTemporaryPasswordByAdmin(
                        job as Job<
                            INotificationEmailWorkerPayload<INotificationTemporaryPasswordPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.forgotPassword:
                    return this.notificationEmailProcessorService.processForgotPassword(
                        job as Job<
                            INotificationEmailWorkerPayload<INotificationForgotPasswordPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.verificationEmail:
                    return this.notificationEmailProcessorService.processVerificationEmail(
                        job as Job<
                            INotificationEmailWorkerPayload<INotificationVerificationEmailPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.verifiedEmail:
                    return this.notificationEmailProcessorService.processVerifiedEmail(
                        job as Job<
                            INotificationEmailWorkerPayload<INotificationVerifiedEmailPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.verifiedMobileNumber:
                    return this.notificationEmailProcessorService.processVerifiedMobileNumber(
                        job as Job<
                            INotificationEmailWorkerPayload<INotificationVerifiedMobileNumberPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.newDeviceLogin:
                    return this.notificationEmailProcessorService.processNewDeviceLogin(
                        job as Job<
                            INotificationEmailWorkerPayload<INotificationNewDeviceLoginPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.resetPassword:
                    return this.notificationEmailProcessorService.processResetPassword(
                        job as Job<
                            INotificationEmailWorkerPayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.resetTwoFactorByAdmin:
                    return this.notificationEmailProcessorService.processResetTwoFactorByAdmin(
                        job as Job<
                            INotificationEmailWorkerPayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.publishTermPolicy:
                    return this.notificationEmailProcessorService.processPublishTermPolicy(
                        job as Job<
                            INotificationEmailWorkerBulkPayload<INotificationPublishTermPolicyPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                default:
                    return {
                        message:
                            'No email processor found for the given job name',
                    };
            }
        } catch (error: unknown) {
            this.logger.error(
                error,
                'Failed to process notification email job'
            );
            throw error;
        }
    }
}

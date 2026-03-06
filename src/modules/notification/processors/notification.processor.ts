import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
    INotificationWorkerPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueProcessorBase } from 'src/queues/bases/queue.processor.base';
import { QueueProcessor } from 'src/queues/decorators/queue.decorator';
import { EnumQueue } from 'src/queues/enums/queue.enum';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

/**
 * Central background job processor for multi-channel notifications.
 * Handles notification routing across email, push, and in-app channels based on user preferences.
 * Processes notifications like device login alerts, password resets, and email verifications.
 */
@QueueProcessor(EnumQueue.notification)
export class NotificationProcessor extends QueueProcessorBase {
    private readonly logger = new Logger(NotificationProcessor.name);

    constructor(
        private readonly notificationProcessorService: NotificationProcessorService
    ) {
        super();
    }

    /**
     * Processes notification jobs from the queue.
     * Routes job to appropriate handler method based on job name (enum).
     * Handles multi-channel notification logic based on user preferences.
     *
     * @param job - The BullMQ job containing notification type and payload
     * @returns Queue response with success/failure status and optional message
     */
    async process(
        job: Job<unknown, IQueueResponse, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        try {
            switch (job.name) {
                case EnumNotificationProcess.newDeviceLogin:
                    return this.notificationProcessorService.processNewDeviceLogin(
                        job as Job<
                            INotificationWorkerPayload<INotificationNewDeviceLoginPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.welcomeByAdmin:
                    return this.notificationProcessorService.processWelcomeByAdmin(
                        job as Job<
                            INotificationWorkerPayload<INotificationWelcomeByAdminPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.temporaryPasswordByAdmin:
                    return this.notificationProcessorService.processTemporaryPasswordByAdmin(
                        job as Job<
                            INotificationWorkerPayload<INotificationTemporaryPasswordPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.verificationEmail:
                    return this.notificationProcessorService.processVerificationEmail(
                        job as Job<
                            INotificationWorkerPayload<INotificationVerificationEmailPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.forgotPassword:
                    return this.notificationProcessorService.processForgotPassword(
                        job as Job<
                            INotificationWorkerPayload<INotificationForgotPasswordPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.verifiedMobileNumber:
                    return this.notificationProcessorService.processVerifiedMobileNumber(
                        job as Job<
                            INotificationWorkerPayload<INotificationVerifiedMobileNumberPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.publishTermPolicy:
                    return this.notificationProcessorService.processPublishTermPolicy(
                        job as Job<
                            INotificationWorkerPayload<INotificationPublishTermPolicyPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.welcome:
                    return this.notificationProcessorService.processWelcome(
                        job as Job<
                            INotificationWorkerPayload<INotificationVerificationEmailPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.verifiedEmail:
                    return this.notificationProcessorService.processVerifiedEmail(
                        job as Job<
                            INotificationWorkerPayload<INotificationVerifiedEmailPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.resetPassword:
                    return this.notificationProcessorService.processResetPassword(
                        job as Job<
                            INotificationWorkerPayload<INotificationVerificationEmailPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.resetTwoFactorByAdmin:
                    return this.notificationProcessorService.processResetTwoFactorByAdmin(
                        job as Job<
                            INotificationWorkerPayload<INotificationVerificationEmailPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.welcomeSocial:
                    return this.notificationProcessorService.processWelcomeSocial(
                        job as Job<
                            INotificationWorkerPayload<INotificationVerificationEmailPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.changePassword:
                    return this.notificationProcessorService.processChangePassword(
                        job as Job<
                            INotificationWorkerPayload,
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
            this.logger.error(error, 'Failed to process notification job');
            throw error;
        }
    }
}

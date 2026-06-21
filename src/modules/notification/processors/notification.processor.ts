import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationAcceptTermPolicyPayload,
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
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Consumes the main notification queue and fans each job out to email, push, and in-app channels.
 */
@QueueProcessor(EnumQueue.notification)
export class NotificationProcessor extends QueueProcessorBase {
    private readonly logger = new Logger(NotificationProcessor.name);

    constructor(
        private readonly notificationProcessorService: NotificationProcessorService
    ) {
        super();
    }

    /** Dispatches each job to its handler by job name. */
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
                case EnumNotificationProcess.userAcceptTermPolicy:
                    return this.notificationProcessorService.processUserAcceptTermPolicy(
                        job as Job<
                            INotificationWorkerPayload<INotificationAcceptTermPolicyPayload>,
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

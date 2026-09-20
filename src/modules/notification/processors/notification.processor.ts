import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationQueuePayload,
    INotificationTemporaryPasswordEncryptedPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Consumes the main notification queue and fans each job out to email, push, and in-app channels.
 */
@QueueProcessor(EnumQueue.notification)
export class NotificationProcessor extends QueueProcessorBase {
    constructor(
        private readonly notificationProcessorService: NotificationProcessorService,
        sentryService: SentryService
    ) {
        super(sentryService);
    }

    /** Dispatches each job to its handler by job name. */
    protected async handle(
        job: Job<unknown, IQueueResponse, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumNotificationProcess.newDeviceLogin:
                return await this.notificationProcessorService.processNewDeviceLogin(
                    job as Job<
                        INotificationQueuePayload<INotificationNewDeviceLoginPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.welcomeByAdmin:
                return await this.notificationProcessorService.processWelcomeByAdmin(
                    job as Job<
                        INotificationQueuePayload<INotificationWelcomeByAdminEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.temporaryPasswordByAdmin:
                return await this.notificationProcessorService.processTemporaryPasswordByAdmin(
                    job as Job<
                        INotificationQueuePayload<INotificationTemporaryPasswordEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.verificationEmail:
                return await this.notificationProcessorService.processVerificationEmail(
                    job as Job<
                        INotificationQueuePayload<INotificationVerificationEmailEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.forgotPassword:
                return await this.notificationProcessorService.processForgotPassword(
                    job as Job<
                        INotificationQueuePayload<INotificationForgotPasswordEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.verifiedMobileNumber:
                return await this.notificationProcessorService.processVerifiedMobileNumber(
                    job as Job<
                        INotificationQueuePayload<INotificationVerifiedMobileNumberPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.publishTermPolicy:
                return await this.notificationProcessorService.processPublishTermPolicy(
                    job as Job<
                        INotificationQueuePayload<INotificationPublishTermPolicyPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.welcome:
                return await this.notificationProcessorService.processWelcome(
                    job as Job<
                        INotificationQueuePayload<INotificationVerificationEmailEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.verifiedEmail:
                return await this.notificationProcessorService.processVerifiedEmail(
                    job as Job<
                        INotificationQueuePayload<INotificationVerifiedEmailPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.resetPassword:
                return await this.notificationProcessorService.processResetPassword(
                    job as Job<
                        INotificationQueuePayload<INotificationVerificationEmailEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.resetTwoFactorByAdmin:
                return await this.notificationProcessorService.processResetTwoFactorByAdmin(
                    job as Job<
                        INotificationQueuePayload<INotificationVerificationEmailEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.welcomeSocial:
                return await this.notificationProcessorService.processWelcomeSocial(
                    job as Job<
                        INotificationQueuePayload<INotificationVerificationEmailEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.changePassword:
                return await this.notificationProcessorService.processChangePassword(
                    job as Job<
                        INotificationQueuePayload,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.userAcceptTermPolicy:
                return await this.notificationProcessorService.processUserAcceptTermPolicy(
                    job as Job<
                        INotificationQueuePayload<INotificationAcceptTermPolicyPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.workspaceInvite:
                return await this.notificationProcessorService.processWorkspaceInvite(
                    job as Job<
                        INotificationQueuePayload<INotificationWorkspaceInviteEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.workspaceJoinRequest:
                return await this.notificationProcessorService.processWorkspaceJoinRequest(
                    job as Job<
                        INotificationQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.workspaceJoinAccepted:
                return await this.notificationProcessorService.processWorkspaceJoinAccepted(
                    job as Job<
                        INotificationQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.workspaceJoinRejected:
                return await this.notificationProcessorService.processWorkspaceJoinRejected(
                    job as Job<
                        INotificationQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            default:
                return {
                    message: `No notification processor found for the given job name ${job.name}`,
                };
        }
    }
}

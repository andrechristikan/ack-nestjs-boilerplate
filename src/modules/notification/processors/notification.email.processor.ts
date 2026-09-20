import { Job, UnrecoverableError } from 'bullmq';
import { EnumQueue } from '@queues/enums/queue.enum';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { SentryService } from '@common/sentry/services/sentry.service';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type {
    INotificationEmailBulkQueuePayload,
    INotificationEmailQueuePayload,
    INotificationEmailUnregisteredQueuePayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordEncryptedPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceInviteUnregisteredEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationEmailProcessorService } from '@modules/notification/services/notification.email.processor.service';
import {
    AwsSESRateLimitDurationInMs,
    AwsSESRateLimitPerDuration,
} from '@common/aws/constants/aws.constant';

/**
 * Consumes the email queue; rate-limited to stay under the AWS SES send quota.
 */
@QueueProcessor(EnumQueue.notificationEmail, {
    limiter: {
        max: AwsSESRateLimitPerDuration,
        duration: AwsSESRateLimitDurationInMs,
    },
})
export class NotificationEmailProcessor extends QueueProcessorBase {
    constructor(
        private readonly notificationEmailProcessorService: NotificationEmailProcessorService,
        sentryService: SentryService
    ) {
        super(sentryService);
    }

    /** Dispatches each job to its handler by job name. */
    protected async handle(
        job: Job<unknown, IQueueResponse, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        try {
            const jobName = job.name;
            switch (jobName) {
                case EnumNotificationProcess.changePassword:
                    return await this.notificationEmailProcessorService.processChangePassword(
                        job as Job<
                            INotificationEmailQueuePayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.welcome:
                    return await this.notificationEmailProcessorService.processWelcome(
                        job as Job<
                            INotificationEmailQueuePayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.welcomeSocial:
                    return await this.notificationEmailProcessorService.processWelcomeSocial(
                        job as Job<
                            INotificationEmailQueuePayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.welcomeByAdmin:
                    return await this.notificationEmailProcessorService.processWelcomeByAdmin(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationWelcomeByAdminEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.temporaryPasswordByAdmin:
                    return await this.notificationEmailProcessorService.processTemporaryPasswordByAdmin(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationTemporaryPasswordEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.forgotPassword:
                    return await this.notificationEmailProcessorService.processForgotPassword(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationForgotPasswordEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.verificationEmail:
                    return await this.notificationEmailProcessorService.processVerificationEmail(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationVerificationEmailEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.verifiedEmail:
                    return await this.notificationEmailProcessorService.processVerifiedEmail(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationVerifiedEmailPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.verifiedMobileNumber:
                    return await this.notificationEmailProcessorService.processVerifiedMobileNumber(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationVerifiedMobileNumberPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.newDeviceLogin:
                    return await this.notificationEmailProcessorService.processNewDeviceLogin(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationNewDeviceLoginPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.resetPassword:
                    return await this.notificationEmailProcessorService.processResetPassword(
                        job as Job<
                            INotificationEmailQueuePayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.resetTwoFactorByAdmin:
                    return await this.notificationEmailProcessorService.processResetTwoFactorByAdmin(
                        job as Job<
                            INotificationEmailQueuePayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.publishTermPolicy:
                    return await this.notificationEmailProcessorService.processPublishTermPolicy(
                        job as Job<
                            INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.workspaceInvite:
                    return await this.notificationEmailProcessorService.processWorkspaceInvite(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationWorkspaceInviteEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.workspaceInviteUnregistered:
                    return await this.notificationEmailProcessorService.processWorkspaceInviteUnregistered(
                        job as Job<
                            INotificationEmailUnregisteredQueuePayload<INotificationWorkspaceInviteUnregisteredEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.workspaceJoinRequest:
                    return await this.notificationEmailProcessorService.processWorkspaceJoinRequest(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.workspaceJoinAccepted:
                    return await this.notificationEmailProcessorService.processWorkspaceJoinAccepted(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.workspaceJoinRejected:
                    return await this.notificationEmailProcessorService.processWorkspaceJoinRejected(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
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
            if (error instanceof HelperDecryptFailedException) {
                throw new UnrecoverableError(error.message);
            }

            throw error;
        }
    }
}

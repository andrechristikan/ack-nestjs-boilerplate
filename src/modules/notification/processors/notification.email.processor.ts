import { Job, UnrecoverableError } from 'bullmq';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { QueueException } from '@queues/exceptions/queue.exception';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { MessageService } from '@common/message/services/message.service';
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
    INotificationVerifiedMobileNumberEncryptedPayload,
    INotificationWelcomeByAdminEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceInviteUnregisteredEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationEmailDeliveryUnknownException } from '@modules/notification/exceptions/notification.email-delivery-unknown.exception';
import { NotificationEmailProcessChangePasswordUseCase } from '@modules/notification/use-cases/notification.email.process-change-password.use-case';
import { NotificationEmailProcessWelcomeUseCase } from '@modules/notification/use-cases/notification.email.process-welcome.use-case';
import { NotificationEmailProcessWelcomeSocialUseCase } from '@modules/notification/use-cases/notification.email.process-welcome-social.use-case';
import { NotificationEmailProcessWelcomeByAdminUseCase } from '@modules/notification/use-cases/notification.email.process-welcome-by-admin.use-case';
import { NotificationEmailProcessTemporaryPasswordByAdminUseCase } from '@modules/notification/use-cases/notification.email.process-temporary-password-by-admin.use-case';
import { NotificationEmailProcessForgotPasswordUseCase } from '@modules/notification/use-cases/notification.email.process-forgot-password.use-case';
import { NotificationEmailProcessVerificationEmailUseCase } from '@modules/notification/use-cases/notification.email.process-verification-email.use-case';
import { NotificationEmailProcessVerifiedEmailUseCase } from '@modules/notification/use-cases/notification.email.process-verified-email.use-case';
import { NotificationEmailProcessVerifiedMobileNumberUseCase } from '@modules/notification/use-cases/notification.email.process-verified-mobile-number.use-case';
import { NotificationEmailProcessNewDeviceLoginUseCase } from '@modules/notification/use-cases/notification.email.process-new-device-login.use-case';
import { NotificationEmailProcessResetPasswordUseCase } from '@modules/notification/use-cases/notification.email.process-reset-password.use-case';
import { NotificationEmailProcessResetTwoFactorByAdminUseCase } from '@modules/notification/use-cases/notification.email.process-reset-two-factor-by-admin.use-case';
import { NotificationEmailProcessPublishTermPolicyUseCase } from '@modules/notification/use-cases/notification.email.process-publish-term-policy.use-case';
import { NotificationEmailProcessWorkspaceInviteUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-invite.use-case';
import { NotificationEmailProcessWorkspaceInviteUnregisteredUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-invite-unregistered.use-case';
import { NotificationEmailProcessWorkspaceJoinRequestUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-join-request.use-case';
import { NotificationEmailProcessWorkspaceJoinAcceptedUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-join-accepted.use-case';
import { NotificationEmailProcessWorkspaceJoinRejectedUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-join-rejected.use-case';
import {
    AwsSESRateLimitDurationInMs,
    AwsSESRateLimitPerDuration,
} from '@common/aws/constants/aws.constant';

@QueueProcessor(EnumNotificationQueue.notificationEmail, {
    limiter: {
        max: AwsSESRateLimitPerDuration,
        duration: AwsSESRateLimitDurationInMs,
    },
})
export class NotificationEmailProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        private readonly notificationEmailProcessChangePasswordUseCase: NotificationEmailProcessChangePasswordUseCase,
        private readonly notificationEmailProcessWelcomeUseCase: NotificationEmailProcessWelcomeUseCase,
        private readonly notificationEmailProcessWelcomeSocialUseCase: NotificationEmailProcessWelcomeSocialUseCase,
        private readonly notificationEmailProcessWelcomeByAdminUseCase: NotificationEmailProcessWelcomeByAdminUseCase,
        private readonly notificationEmailProcessTemporaryPasswordByAdminUseCase: NotificationEmailProcessTemporaryPasswordByAdminUseCase,
        private readonly notificationEmailProcessForgotPasswordUseCase: NotificationEmailProcessForgotPasswordUseCase,
        private readonly notificationEmailProcessVerificationEmailUseCase: NotificationEmailProcessVerificationEmailUseCase,
        private readonly notificationEmailProcessVerifiedEmailUseCase: NotificationEmailProcessVerifiedEmailUseCase,
        private readonly notificationEmailProcessVerifiedMobileNumberUseCase: NotificationEmailProcessVerifiedMobileNumberUseCase,
        private readonly notificationEmailProcessNewDeviceLoginUseCase: NotificationEmailProcessNewDeviceLoginUseCase,
        private readonly notificationEmailProcessResetPasswordUseCase: NotificationEmailProcessResetPasswordUseCase,
        private readonly notificationEmailProcessResetTwoFactorByAdminUseCase: NotificationEmailProcessResetTwoFactorByAdminUseCase,
        private readonly notificationEmailProcessPublishTermPolicyUseCase: NotificationEmailProcessPublishTermPolicyUseCase,
        private readonly notificationEmailProcessWorkspaceInviteUseCase: NotificationEmailProcessWorkspaceInviteUseCase,
        private readonly notificationEmailProcessWorkspaceInviteUnregisteredUseCase: NotificationEmailProcessWorkspaceInviteUnregisteredUseCase,
        private readonly notificationEmailProcessWorkspaceJoinRequestUseCase: NotificationEmailProcessWorkspaceJoinRequestUseCase,
        private readonly notificationEmailProcessWorkspaceJoinAcceptedUseCase: NotificationEmailProcessWorkspaceJoinAcceptedUseCase,
        private readonly notificationEmailProcessWorkspaceJoinRejectedUseCase: NotificationEmailProcessWorkspaceJoinRejectedUseCase
    ) {
        super(sentryService, messageService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        try {
            const jobName = job.name;
            switch (jobName) {
                case EnumNotificationProcess.changePassword:
                    return await this.notificationEmailProcessChangePasswordUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.welcome:
                    return await this.notificationEmailProcessWelcomeUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.welcomeSocial:
                    return await this.notificationEmailProcessWelcomeSocialUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.welcomeByAdmin:
                    return await this.notificationEmailProcessWelcomeByAdminUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationWelcomeByAdminEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.temporaryPasswordByAdmin:
                    return await this.notificationEmailProcessTemporaryPasswordByAdminUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationTemporaryPasswordEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.forgotPassword:
                    return await this.notificationEmailProcessForgotPasswordUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationForgotPasswordEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.verificationEmail:
                    return await this.notificationEmailProcessVerificationEmailUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationVerificationEmailEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.verifiedEmail:
                    return await this.notificationEmailProcessVerifiedEmailUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationVerifiedEmailPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.verifiedMobileNumber:
                    return await this.notificationEmailProcessVerifiedMobileNumberUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationVerifiedMobileNumberEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.newDeviceLogin:
                    return await this.notificationEmailProcessNewDeviceLoginUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationNewDeviceLoginPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );
                case EnumNotificationProcess.resetPassword:
                    return await this.notificationEmailProcessResetPasswordUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.resetTwoFactorByAdmin:
                    return await this.notificationEmailProcessResetTwoFactorByAdminUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.publishTermPolicy:
                    return await this.notificationEmailProcessPublishTermPolicyUseCase.execute(
                        job as Job<
                            INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.workspaceInvite:
                    return await this.notificationEmailProcessWorkspaceInviteUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationWorkspaceInviteEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.workspaceInviteUnregistered:
                    return await this.notificationEmailProcessWorkspaceInviteUnregisteredUseCase.execute(
                        job as Job<
                            INotificationEmailUnregisteredQueuePayload<INotificationWorkspaceInviteUnregisteredEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.workspaceJoinRequest:
                    return await this.notificationEmailProcessWorkspaceJoinRequestUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.workspaceJoinAccepted:
                    return await this.notificationEmailProcessWorkspaceJoinAcceptedUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                case EnumNotificationProcess.workspaceJoinRejected:
                    return await this.notificationEmailProcessWorkspaceJoinRejectedUseCase.execute(
                        job as Job<
                            INotificationEmailQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
                            IQueueResponse,
                            EnumNotificationProcess
                        >
                    );

                default: {
                    const message = this.messageService.setMessage(
                        'notification.queue.email.error.unknownProcess',
                        { properties: { process: job.name } }
                    );
                    throw new QueueException(message, true);
                }
            }
        } catch (error: unknown) {
            if (
                error instanceof HelperDecryptFailedException ||
                error instanceof NotificationEmailDeliveryUnknownException
            ) {
                const unrecoverable = new UnrecoverableError(error.message);
                unrecoverable.cause = error;

                throw unrecoverable;
            }

            if (
                error instanceof QueueException ||
                error instanceof AppBaseException ||
                error instanceof UnrecoverableError
            ) {
                throw error;
            }

            this.throwUnknownException(error);
        }
    }
}

import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationBulkQueuePayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationQueuePayload,
    INotificationTemporaryPasswordEncryptedPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberEncryptedPayload,
    INotificationWelcomeByAdminEncryptedPayload,
    INotificationWelcomeEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationProcessNewDeviceLoginUseCase } from '@modules/notification/use-cases/notification.process-new-device-login.use-case';
import { NotificationProcessWelcomeByAdminUseCase } from '@modules/notification/use-cases/notification.process-welcome-by-admin.use-case';
import { NotificationProcessTemporaryPasswordByAdminUseCase } from '@modules/notification/use-cases/notification.process-temporary-password-by-admin.use-case';
import { NotificationProcessVerificationEmailUseCase } from '@modules/notification/use-cases/notification.process-verification-email.use-case';
import { NotificationProcessForgotPasswordUseCase } from '@modules/notification/use-cases/notification.process-forgot-password.use-case';
import { NotificationProcessVerifiedMobileNumberUseCase } from '@modules/notification/use-cases/notification.process-verified-mobile-number.use-case';
import { NotificationProcessPublishTermPolicyUseCase } from '@modules/notification/use-cases/notification.process-publish-term-policy.use-case';
import { NotificationProcessWelcomeUseCase } from '@modules/notification/use-cases/notification.process-welcome.use-case';
import { NotificationProcessVerifiedEmailUseCase } from '@modules/notification/use-cases/notification.process-verified-email.use-case';
import { NotificationProcessResetPasswordUseCase } from '@modules/notification/use-cases/notification.process-reset-password.use-case';
import { NotificationProcessResetTwoFactorByAdminUseCase } from '@modules/notification/use-cases/notification.process-reset-two-factor-by-admin.use-case';
import { NotificationProcessWelcomeSocialUseCase } from '@modules/notification/use-cases/notification.process-welcome-social.use-case';
import { NotificationProcessChangePasswordUseCase } from '@modules/notification/use-cases/notification.process-change-password.use-case';
import { NotificationProcessUserAcceptTermPolicyUseCase } from '@modules/notification/use-cases/notification.process-user-accept-term-policy.use-case';
import { NotificationProcessWorkspaceInviteUseCase } from '@modules/notification/use-cases/notification.process-workspace-invite.use-case';
import { NotificationProcessWorkspaceJoinRequestUseCase } from '@modules/notification/use-cases/notification.process-workspace-join-request.use-case';
import { NotificationProcessWorkspaceJoinAcceptedUseCase } from '@modules/notification/use-cases/notification.process-workspace-join-accepted.use-case';
import { NotificationProcessWorkspaceJoinRejectedUseCase } from '@modules/notification/use-cases/notification.process-workspace-join-rejected.use-case';
import { Job } from 'bullmq';
import { QueueException } from '@queues/exceptions/queue.exception';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@QueueProcessor(EnumNotificationQueue.notification)
export class NotificationProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        private readonly notificationProcessNewDeviceLoginUseCase: NotificationProcessNewDeviceLoginUseCase,
        private readonly notificationProcessWelcomeByAdminUseCase: NotificationProcessWelcomeByAdminUseCase,
        private readonly notificationProcessTemporaryPasswordByAdminUseCase: NotificationProcessTemporaryPasswordByAdminUseCase,
        private readonly notificationProcessVerificationEmailUseCase: NotificationProcessVerificationEmailUseCase,
        private readonly notificationProcessForgotPasswordUseCase: NotificationProcessForgotPasswordUseCase,
        private readonly notificationProcessVerifiedMobileNumberUseCase: NotificationProcessVerifiedMobileNumberUseCase,
        private readonly notificationProcessPublishTermPolicyUseCase: NotificationProcessPublishTermPolicyUseCase,
        private readonly notificationProcessWelcomeUseCase: NotificationProcessWelcomeUseCase,
        private readonly notificationProcessVerifiedEmailUseCase: NotificationProcessVerifiedEmailUseCase,
        private readonly notificationProcessResetPasswordUseCase: NotificationProcessResetPasswordUseCase,
        private readonly notificationProcessResetTwoFactorByAdminUseCase: NotificationProcessResetTwoFactorByAdminUseCase,
        private readonly notificationProcessWelcomeSocialUseCase: NotificationProcessWelcomeSocialUseCase,
        private readonly notificationProcessChangePasswordUseCase: NotificationProcessChangePasswordUseCase,
        private readonly notificationProcessUserAcceptTermPolicyUseCase: NotificationProcessUserAcceptTermPolicyUseCase,
        private readonly notificationProcessWorkspaceInviteUseCase: NotificationProcessWorkspaceInviteUseCase,
        private readonly notificationProcessWorkspaceJoinRequestUseCase: NotificationProcessWorkspaceJoinRequestUseCase,
        private readonly notificationProcessWorkspaceJoinAcceptedUseCase: NotificationProcessWorkspaceJoinAcceptedUseCase,
        private readonly notificationProcessWorkspaceJoinRejectedUseCase: NotificationProcessWorkspaceJoinRejectedUseCase
    ) {
        super(sentryService, messageService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumNotificationProcess.newDeviceLogin:
                return await this.notificationProcessNewDeviceLoginUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationNewDeviceLoginPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.welcomeByAdmin:
                return await this.notificationProcessWelcomeByAdminUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationWelcomeByAdminEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.temporaryPasswordByAdmin:
                return await this.notificationProcessTemporaryPasswordByAdminUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationTemporaryPasswordEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.verificationEmail:
                return await this.notificationProcessVerificationEmailUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationVerificationEmailEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.forgotPassword:
                return await this.notificationProcessForgotPasswordUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationForgotPasswordEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.verifiedMobileNumber:
                return await this.notificationProcessVerifiedMobileNumberUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationVerifiedMobileNumberEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.publishTermPolicy:
            case EnumNotificationProcess.resendPublishTermPolicy:
                return await this.notificationProcessPublishTermPolicyUseCase.execute(
                    job as Job<
                        INotificationBulkQueuePayload<INotificationPublishTermPolicyPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.welcome:
                return await this.notificationProcessWelcomeUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationWelcomeEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.verifiedEmail:
                return await this.notificationProcessVerifiedEmailUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationVerifiedEmailPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.resetPassword:
                return await this.notificationProcessResetPasswordUseCase.execute(
                    job as Job<
                        INotificationQueuePayload,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.resetTwoFactorByAdmin:
                return await this.notificationProcessResetTwoFactorByAdminUseCase.execute(
                    job as Job<
                        INotificationQueuePayload,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.welcomeSocial:
                return await this.notificationProcessWelcomeSocialUseCase.execute(
                    job as Job<
                        INotificationQueuePayload,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.changePassword:
                return await this.notificationProcessChangePasswordUseCase.execute(
                    job as Job<
                        INotificationQueuePayload,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.userAcceptTermPolicy:
                return await this.notificationProcessUserAcceptTermPolicyUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationAcceptTermPolicyPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.workspaceInvite:
                return await this.notificationProcessWorkspaceInviteUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationWorkspaceInviteEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.workspaceJoinRequest:
                return await this.notificationProcessWorkspaceJoinRequestUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.workspaceJoinAccepted:
                return await this.notificationProcessWorkspaceJoinAcceptedUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            case EnumNotificationProcess.workspaceJoinRejected:
                return await this.notificationProcessWorkspaceJoinRejectedUseCase.execute(
                    job as Job<
                        INotificationQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
                        IQueueResponse,
                        EnumNotificationProcess
                    >
                );
            default: {
                const message = this.messageService.setMessage(
                    'notification.queue.error.unknownProcess',
                    { properties: { process: job.name } }
                );
                throw new QueueException(message, true);
            }
        }
    }
}

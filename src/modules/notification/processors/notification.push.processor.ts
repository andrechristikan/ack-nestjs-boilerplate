import {
    FirebaseMaxRateLimitPerDuration,
    FirebaseRateLimitDurationInMs,
} from '@common/firebase/constants/firebase.constant';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationPushCleanupTokenEncryptedPayload,
    INotificationPushQueuePayload,
    INotificationTemporaryPasswordPushPayload,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushProcessNewDeviceLoginUseCase } from '@modules/notification/use-cases/notification.push.process-new-device-login.use-case';
import { NotificationPushProcessResetTwoFactorByAdminUseCase } from '@modules/notification/use-cases/notification.push.process-reset-two-factor-by-admin.use-case';
import { NotificationPushProcessTemporaryPasswordByAdminUseCase } from '@modules/notification/use-cases/notification.push.process-temporary-password-by-admin.use-case';
import { NotificationPushProcessResetPasswordUseCase } from '@modules/notification/use-cases/notification.push.process-reset-password.use-case';
import { NotificationPushProcessForgotPasswordUseCase } from '@modules/notification/use-cases/notification.push.process-forgot-password.use-case';
import { NotificationPushProcessWorkspaceInviteUseCase } from '@modules/notification/use-cases/notification.push.process-workspace-invite.use-case';
import { NotificationPushProcessWorkspaceJoinRequestUseCase } from '@modules/notification/use-cases/notification.push.process-workspace-join-request.use-case';
import { NotificationPushProcessWorkspaceJoinAcceptedUseCase } from '@modules/notification/use-cases/notification.push.process-workspace-join-accepted.use-case';
import { NotificationPushProcessWorkspaceJoinRejectedUseCase } from '@modules/notification/use-cases/notification.push.process-workspace-join-rejected.use-case';
import { NotificationPushProcessCleanupTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-tokens.use-case';
import { NotificationPushProcessCleanupStaleTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-stale-tokens.use-case';
import { Job, UnrecoverableError } from 'bullmq';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { QueueException } from '@queues/exceptions/queue.exception';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@QueueProcessor(EnumNotificationQueue.notificationPush, {
    limiter: {
        max: FirebaseMaxRateLimitPerDuration,
        duration: FirebaseRateLimitDurationInMs,
    },
})
export class NotificationPushProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        private readonly notificationPushProcessNewDeviceLoginUseCase: NotificationPushProcessNewDeviceLoginUseCase,
        private readonly notificationPushProcessResetTwoFactorByAdminUseCase: NotificationPushProcessResetTwoFactorByAdminUseCase,
        private readonly notificationPushProcessTemporaryPasswordByAdminUseCase: NotificationPushProcessTemporaryPasswordByAdminUseCase,
        private readonly notificationPushProcessResetPasswordUseCase: NotificationPushProcessResetPasswordUseCase,
        private readonly notificationPushProcessForgotPasswordUseCase: NotificationPushProcessForgotPasswordUseCase,
        private readonly notificationPushProcessWorkspaceInviteUseCase: NotificationPushProcessWorkspaceInviteUseCase,
        private readonly notificationPushProcessWorkspaceJoinRequestUseCase: NotificationPushProcessWorkspaceJoinRequestUseCase,
        private readonly notificationPushProcessWorkspaceJoinAcceptedUseCase: NotificationPushProcessWorkspaceJoinAcceptedUseCase,
        private readonly notificationPushProcessWorkspaceJoinRejectedUseCase: NotificationPushProcessWorkspaceJoinRejectedUseCase,
        private readonly notificationPushProcessCleanupTokensUseCase: NotificationPushProcessCleanupTokensUseCase,
        private readonly notificationPushProcessCleanupStaleTokensUseCase: NotificationPushProcessCleanupStaleTokensUseCase
    ) {
        super(sentryService, messageService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumNotificationPushProcess>
    ): Promise<IQueueResponse> {
        try {
            switch (job.name) {
                case EnumNotificationPushProcess.newDeviceLogin:
                    return await this.notificationPushProcessNewDeviceLoginUseCase.execute(
                        job as Job<
                            INotificationPushQueuePayload<INotificationNewDeviceLoginPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.resetTwoFactorByAdmin:
                    return await this.notificationPushProcessResetTwoFactorByAdminUseCase.execute(
                        job as Job<
                            INotificationPushQueuePayload,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.temporaryPasswordByAdmin:
                    return await this.notificationPushProcessTemporaryPasswordByAdminUseCase.execute(
                        job as Job<
                            INotificationPushQueuePayload<INotificationTemporaryPasswordPushPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.resetPassword:
                    return await this.notificationPushProcessResetPasswordUseCase.execute(
                        job as Job<
                            INotificationPushQueuePayload,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.forgotPassword:
                    return await this.notificationPushProcessForgotPasswordUseCase.execute(
                        job as Job<
                            INotificationPushQueuePayload,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.workspaceInvite:
                    return await this.notificationPushProcessWorkspaceInviteUseCase.execute(
                        job as Job<
                            INotificationPushQueuePayload<INotificationWorkspaceInvitePushPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.workspaceJoinRequest:
                    return await this.notificationPushProcessWorkspaceJoinRequestUseCase.execute(
                        job as Job<
                            INotificationPushQueuePayload<INotificationWorkspaceJoinRequestPushPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.workspaceJoinAccepted:
                    return await this.notificationPushProcessWorkspaceJoinAcceptedUseCase.execute(
                        job as Job<
                            INotificationPushQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.workspaceJoinRejected:
                    return await this.notificationPushProcessWorkspaceJoinRejectedUseCase.execute(
                        job as Job<
                            INotificationPushQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.cleanupTokens:
                    return await this.notificationPushProcessCleanupTokensUseCase.execute(
                        job as Job<
                            INotificationPushCleanupTokenEncryptedPayload,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.cleanupStaleTokens:
                    return await this.notificationPushProcessCleanupStaleTokensUseCase.execute();
                default: {
                    const message = this.messageService.setMessage(
                        'notification.queue.push.error.unknownProcess',
                        { properties: { process: job.name } }
                    );
                    throw new QueueException(message, true);
                }
            }
        } catch (error: unknown) {
            if (error instanceof HelperDecryptFailedException) {
                throw new UnrecoverableError(error.message);
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

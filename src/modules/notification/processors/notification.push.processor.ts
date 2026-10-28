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
import { NotificationPushProcessorService } from '@modules/notification/services/notification.push.processor.service';
import { Job, UnrecoverableError } from 'bullmq';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { QueueException } from '@queues/exceptions/queue.exception';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Consumes the push queue (FCM); rate-limited to stay under Firebase send quota.
 */
@QueueProcessor(EnumQueue.notificationPush, {
    limiter: {
        max: FirebaseMaxRateLimitPerDuration,
        duration: FirebaseRateLimitDurationInMs,
    },
})
export class NotificationPushProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        private readonly notificationPushProcessorService: NotificationPushProcessorService
    ) {
        super(sentryService);
    }

    /** Dispatches each job to its handler by job name. */
    protected async handle(
        job: Job<unknown, IQueueResponse, EnumNotificationPushProcess>
    ): Promise<IQueueResponse> {
        try {
            switch (job.name) {
                case EnumNotificationPushProcess.newDeviceLogin:
                    return await this.notificationPushProcessorService.processNewDeviceLogin(
                        job as Job<
                            INotificationPushQueuePayload<INotificationNewDeviceLoginPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.resetTwoFactorByAdmin:
                    return await this.notificationPushProcessorService.processResetTwoFactorByAdmin(
                        job as Job<
                            INotificationPushQueuePayload,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.temporaryPasswordByAdmin:
                    return await this.notificationPushProcessorService.processTemporaryPasswordByAdmin(
                        job as Job<
                            INotificationPushQueuePayload<INotificationTemporaryPasswordPushPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.resetPassword:
                    return await this.notificationPushProcessorService.processResetPassword(
                        job as Job<
                            INotificationPushQueuePayload,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.forgotPassword:
                    return await this.notificationPushProcessorService.processForgotPassword(
                        job as Job<
                            INotificationPushQueuePayload,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.workspaceInvite:
                    return await this.notificationPushProcessorService.processWorkspaceInvite(
                        job as Job<
                            INotificationPushQueuePayload<INotificationWorkspaceInvitePushPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.workspaceJoinRequest:
                    return await this.notificationPushProcessorService.processWorkspaceJoinRequest(
                        job as Job<
                            INotificationPushQueuePayload<INotificationWorkspaceJoinRequestPushPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.workspaceJoinAccepted:
                    return await this.notificationPushProcessorService.processWorkspaceJoinAccepted(
                        job as Job<
                            INotificationPushQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.workspaceJoinRejected:
                    return await this.notificationPushProcessorService.processWorkspaceJoinRejected(
                        job as Job<
                            INotificationPushQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.cleanupTokens:
                    return await this.notificationPushProcessorService.processCleanupTokens(
                        job as Job<
                            INotificationPushCleanupTokenEncryptedPayload,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.cleanupStaleTokens:
                    return await this.notificationPushProcessorService.processCleanupStaleTokens();
                default:
                    this.notificationPushProcessorService.processUnknown(
                        job.name
                    );
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

            throw new AppUnknownException(error);
        }
    }
}

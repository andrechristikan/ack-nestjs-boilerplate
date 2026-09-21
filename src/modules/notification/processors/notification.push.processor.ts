import {
    FirebaseMaxRateLimitPerDuration,
    FirebaseRateLimitDurationInMs,
} from '@common/firebase/constants/firebase.constant';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationPushCleanupTokenQueuePayload,
    INotificationPushQueuePayload,
    INotificationTemporaryPasswordPushPayload,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushProcessorService } from '@modules/notification/services/notification.push.processor.service';
import { Job } from 'bullmq';
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
        private readonly notificationPushProcessorService: NotificationPushProcessorService,
        sentryService: SentryService
    ) {
        super(sentryService);
    }

    /** Dispatches each job to its handler by job name. */
    protected async handle(
        job: Job<unknown, IQueueResponse, EnumNotificationPushProcess>
    ): Promise<IQueueResponse> {
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
                        INotificationPushCleanupTokenQueuePayload,
                        IQueueResponse,
                        EnumNotificationPushProcess
                    >
                );
            case EnumNotificationPushProcess.cleanupStaleTokens:
                return await this.notificationPushProcessorService.processCleanupStaleTokens();
            default:
                return {
                    message: `No notification processor found for the given job name ${job.name}`,
                };
        }
    }
}

import {
    FirebaseMaxRateLimitPerDuration,
    FirebaseRateLimitDurationInMs,
} from '@common/firebase/constants/firebase.constant';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewDeviceLoginPayload,
    INotificationPushWorkerCleanupTokenPayload,
    INotificationPushWorkerPayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushProcessorService } from '@modules/notification/services/notification.push.processor.service';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

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
    private readonly logger = new Logger(NotificationPushProcessor.name);

    constructor(
        private readonly notificationPushProcessorService: NotificationPushProcessorService
    ) {
        super();
    }

    /** Dispatches each job to its handler by job name. */
    async process(
        job: Job<unknown, IQueueResponse, EnumNotificationPushProcess>
    ): Promise<IQueueResponse> {
        try {
            switch (job.name) {
                case EnumNotificationPushProcess.newDeviceLogin:
                    return this.notificationPushProcessorService.processNewDeviceLogin(
                        job as Job<
                            INotificationPushWorkerPayload<INotificationNewDeviceLoginPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.resetTwoFactorByAdmin:
                    return this.notificationPushProcessorService.processResetTwoFactorByAdmin(
                        job as Job<
                            INotificationPushWorkerPayload,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.temporaryPasswordByAdmin:
                    return this.notificationPushProcessorService.processTemporaryPasswordByAdmin(
                        job as Job<
                            INotificationPushWorkerPayload<INotificationTemporaryPasswordPayload>,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.resetPassword:
                    return this.notificationPushProcessorService.processResetPassword(
                        job as Job<
                            INotificationPushWorkerPayload,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.cleanupTokens:
                    return this.notificationPushProcessorService.processCleanupTokens(
                        job as Job<
                            INotificationPushWorkerCleanupTokenPayload,
                            IQueueResponse,
                            EnumNotificationPushProcess
                        >
                    );
                case EnumNotificationPushProcess.cleanupStaleTokens:
                    return this.notificationPushProcessorService.processCleanupStaleTokens();
                default:
                    return {
                        message: `No notification processor found for the given job name ${job.name}`,
                    };
            }
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to process notification push job');
            throw error;
        }
    }
}

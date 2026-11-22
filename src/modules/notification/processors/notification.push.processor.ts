import {
    FirebaseMaxRateLimitPerDuration,
    FirebaseRateLimitDurationInMs,
} from '@common/firebase/constants/firebase.constant';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type { INotificationPushSendPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationPushProcessSendUseCase } from '@modules/notification/use-cases/notification.push.process-send.use-case';
import { NotificationPushProcessCleanupStaleTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-stale-tokens.use-case';
import { Job, UnrecoverableError } from 'bullmq';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';

@QueueProcessor(EnumNotificationQueue.notificationPush, {
    limiter: {
        max: FirebaseMaxRateLimitPerDuration,
        duration: FirebaseRateLimitDurationInMs,
    },
})
export class NotificationPushProcessor extends QueueProcessorBase {
    constructor(
        private readonly notificationPushProcessSendUseCase: NotificationPushProcessSendUseCase,
        private readonly notificationPushProcessCleanupStaleTokensUseCase: NotificationPushProcessCleanupStaleTokensUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumNotificationPushProcess>,
        data: unknown,
        outboxId: string | null
    ): Promise<IQueueResponse> {
        try {
            switch (job.name) {
                case EnumNotificationPushProcess.send: {
                    if (outboxId === null) {
                        this.throwUnrecoverable(
                            'notification.queue.error.outboxIdMissing'
                        );
                    }

                    return await this.notificationPushProcessSendUseCase.execute(
                        outboxId,
                        data as INotificationPushSendPayload
                    );
                }
                case EnumNotificationPushProcess.cleanupStaleTokens:
                    return await this.notificationPushProcessCleanupStaleTokensUseCase.execute();
                default:
                    this.throwUnknownProcess(
                        'notification.queue.push.error.unknownProcess',
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

            this.throwUnknownException(error);
        }
    }
}

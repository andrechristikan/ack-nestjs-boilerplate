import { CacheService } from '@common/cache/services/cache.service';
import {
    FirebaseMaxRateLimitPerDuration,
    FirebaseRateLimitDurationInMs,
} from '@common/firebase/constants/firebase.constant';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationPushCleanupTokenEncryptedPayload,
    INotificationPushSendPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushProcessSendUseCase } from '@modules/notification/use-cases/notification.push.process-send.use-case';
import { NotificationPushProcessCleanupTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-tokens.use-case';
import { NotificationPushProcessCleanupStaleTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-stale-tokens.use-case';
import { Job, UnrecoverableError } from 'bullmq';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
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
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        protected readonly cacheService: CacheService,
        protected readonly outboxService: OutboxService,
        private readonly notificationPushProcessSendUseCase: NotificationPushProcessSendUseCase,
        private readonly notificationPushProcessCleanupTokensUseCase: NotificationPushProcessCleanupTokensUseCase,
        private readonly notificationPushProcessCleanupStaleTokensUseCase: NotificationPushProcessCleanupStaleTokensUseCase
    ) {
        super(sentryService, messageService, cacheService, outboxService);
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
                        const message = this.messageService.setMessage(
                            'notification.queue.error.outboxIdMissing'
                        );
                        throw new UnrecoverableError(message);
                    }

                    return await this.notificationPushProcessSendUseCase.execute(
                        outboxId,
                        data as INotificationPushSendPayload
                    );
                }
                case EnumNotificationPushProcess.cleanupTokens:
                    return await this.notificationPushProcessCleanupTokensUseCase.execute(
                        data as INotificationPushCleanupTokenEncryptedPayload
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

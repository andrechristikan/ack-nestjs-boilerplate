import { CacheService } from '@common/cache/services/cache.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationBulkQueuePayload,
    INotificationNotifyPayload,
    INotificationPublishTermPolicyPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationProcessPublishTermPolicyUseCase } from '@modules/notification/use-cases/notification.process-publish-term-policy.use-case';
import { NotificationProcessUseCase } from '@modules/notification/use-cases/notification.process.use-case';
import { Job, UnrecoverableError } from 'bullmq';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';

@QueueProcessor(EnumNotificationQueue.notification)
export class NotificationProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        protected readonly cacheService: CacheService,
        protected readonly outboxService: OutboxService,
        private readonly notificationProcessPublishTermPolicyUseCase: NotificationProcessPublishTermPolicyUseCase,
        private readonly notificationProcessUseCase: NotificationProcessUseCase
    ) {
        super(sentryService, messageService, cacheService, outboxService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumNotificationProcess>,
        data: unknown,
        outboxId: string | null
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumNotificationProcess.notify: {
                if (outboxId === null) {
                    const message = this.messageService.setMessage(
                        'notification.queue.error.outboxIdMissing'
                    );
                    throw new UnrecoverableError(message);
                }

                return await this.notificationProcessUseCase.execute(
                    outboxId,
                    data as INotificationNotifyPayload
                );
            }
            case EnumNotificationProcess.publishTermPolicy:
            case EnumNotificationProcess.resendPublishTermPolicy:
                return await this.notificationProcessPublishTermPolicyUseCase.execute(
                    data as INotificationBulkQueuePayload<INotificationPublishTermPolicyPayload>
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

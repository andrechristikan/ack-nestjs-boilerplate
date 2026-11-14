import { CacheService } from '@common/cache/services/cache.service';
import { Job, UnrecoverableError } from 'bullmq';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type {
    INotificationEmailBulkQueuePayload,
    INotificationEmailSendPayload,
    INotificationEmailSendUnregisteredPayload,
    INotificationPublishTermPolicyPayload,
} from '@modules/notification/interfaces/notification.interface';
import {
    EnumNotificationEmailProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { NotificationEmailDeliveryUnknownException } from '@modules/notification/exceptions/notification.email-delivery-unknown.exception';
import { NotificationEmailProcessPublishTermPolicyUseCase } from '@modules/notification/use-cases/notification.email.process-publish-term-policy.use-case';
import { NotificationEmailProcessSendUseCase } from '@modules/notification/use-cases/notification.email.process-send.use-case';
import { NotificationEmailProcessSendUnregisteredUseCase } from '@modules/notification/use-cases/notification.email.process-send-unregistered.use-case';
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
        protected readonly cacheService: CacheService,
        protected readonly outboxService: OutboxService,
        private readonly notificationEmailProcessPublishTermPolicyUseCase: NotificationEmailProcessPublishTermPolicyUseCase,
        private readonly notificationEmailProcessSendUseCase: NotificationEmailProcessSendUseCase,
        private readonly notificationEmailProcessSendUnregisteredUseCase: NotificationEmailProcessSendUnregisteredUseCase
    ) {
        super(sentryService, messageService, cacheService, outboxService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumNotificationEmailProcess>,
        data: unknown,
        outboxId: string | null
    ): Promise<IQueueResponse> {
        try {
            const jobName = job.name;
            switch (jobName) {
                case EnumNotificationEmailProcess.send: {
                    if (outboxId === null) {
                        const message = this.messageService.setMessage(
                            'notification.queue.error.outboxIdMissing'
                        );
                        throw new UnrecoverableError(message);
                    }

                    return await this.notificationEmailProcessSendUseCase.execute(
                        outboxId,
                        data as INotificationEmailSendPayload
                    );
                }

                case EnumNotificationEmailProcess.sendUnregistered:
                    return await this.notificationEmailProcessSendUnregisteredUseCase.execute(
                        data as INotificationEmailSendUnregisteredPayload
                    );

                case EnumNotificationEmailProcess.publishTermPolicy:
                    return await this.notificationEmailProcessPublishTermPolicyUseCase.execute(
                        data as INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload>
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

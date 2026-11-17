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
import type { INotificationSmsSendPayload } from '@modules/notification/interfaces/notification.interface';
import {
    EnumNotificationQueue,
    EnumNotificationSmsProcess,
} from '@modules/notification/enums/notification.enum';
import { NotificationSmsProcessSendUseCase } from '@modules/notification/use-cases/notification.sms.process-send.use-case';

@QueueProcessor(EnumNotificationQueue.notificationSms)
export class NotificationSmsProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        protected readonly cacheService: CacheService,
        protected readonly outboxService: OutboxService,
        private readonly notificationSmsProcessSendUseCase: NotificationSmsProcessSendUseCase
    ) {
        super(sentryService, messageService, cacheService, outboxService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumNotificationSmsProcess>,
        data: unknown,
        outboxId: string | null
    ): Promise<IQueueResponse> {
        try {
            const jobName = job.name;
            switch (jobName) {
                case EnumNotificationSmsProcess.send: {
                    if (outboxId === null) {
                        const message = this.messageService.setMessage(
                            'notification.queue.error.outboxIdMissing'
                        );
                        throw new UnrecoverableError(message);
                    }

                    return await this.notificationSmsProcessSendUseCase.execute(
                        outboxId,
                        data as INotificationSmsSendPayload
                    );
                }

                default: {
                    const message = this.messageService.setMessage(
                        'notification.queue.sms.error.unknownProcess',
                        { properties: { process: job.name } }
                    );
                    throw new QueueException(message, true);
                }
            }
        } catch (error: unknown) {
            if (error instanceof HelperDecryptFailedException) {
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

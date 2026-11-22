import { Job, UnrecoverableError } from 'bullmq';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
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
        private readonly notificationSmsProcessSendUseCase: NotificationSmsProcessSendUseCase
    ) {
        super();
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
                        this.throwUnrecoverable(
                            'notification.queue.error.outboxIdMissing'
                        );
                    }

                    return await this.notificationSmsProcessSendUseCase.execute(
                        outboxId,
                        data as INotificationSmsSendPayload
                    );
                }

                default:
                    this.throwUnknownProcess(
                        'notification.queue.sms.error.unknownProcess',
                        job.name
                    );
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

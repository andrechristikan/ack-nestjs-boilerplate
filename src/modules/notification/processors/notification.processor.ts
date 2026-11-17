import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type { INotificationNotifyPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationProcessUseCase } from '@modules/notification/use-cases/notification.process.use-case';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';

@QueueProcessor(EnumNotificationQueue.notification)
export class NotificationProcessor extends QueueProcessorBase {
    constructor(
        private readonly notificationProcessUseCase: NotificationProcessUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumNotificationProcess>,
        data: unknown,
        outboxId: string | null
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumNotificationProcess.notify: {
                if (outboxId === null) {
                    this.throwUnrecoverable(
                        'notification.queue.error.outboxIdMissing'
                    );
                }

                return await this.notificationProcessUseCase.execute(
                    outboxId,
                    data as INotificationNotifyPayload
                );
            }
            default:
                this.throwUnknownProcess(
                    'notification.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}

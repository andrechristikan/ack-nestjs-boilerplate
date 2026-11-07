import { EnumSessionProcess } from '@modules/session/enums/session.enum';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { SessionProcessPurgeLoginsUseCase } from '@modules/session/use-cases/session.process-purge-logins.use-case';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { QueueException } from '@queues/exceptions/queue.exception';
import { EnumSessionQueue } from '@modules/session/enums/session.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@QueueProcessor(EnumSessionQueue.session)
export class SessionProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        private readonly sessionProcessPurgeLoginsUseCase: SessionProcessPurgeLoginsUseCase
    ) {
        super(sentryService, messageService);
    }

    protected async handle(
        job: Job<ISessionPurgeLoginsPayload, IQueueResponse, EnumSessionProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumSessionProcess.purgeLogins:
                return await this.sessionProcessPurgeLoginsUseCase.execute(job);
            default: {
                const message = this.messageService.setMessage(
                    'session.queue.error.unknownProcess',
                    { properties: { process: job.name } }
                );

                throw new QueueException(message, true);
            }
        }
    }
}

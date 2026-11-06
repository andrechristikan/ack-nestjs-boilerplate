import { EnumSessionProcess } from '@modules/session/enums/session.enum';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { SessionProcessorService } from '@modules/session/services/processor/session.processor.service';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@QueueProcessor(EnumQueue.session)
export class SessionProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        private readonly sessionProcessorService: SessionProcessorService
    ) {
        super(sentryService, messageService);
    }

    protected async handle(
        job: Job<ISessionPurgeLoginsPayload, IQueueResponse, EnumSessionProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumSessionProcess.purgeLogins:
                return await this.sessionProcessorService.processPurgeLogins(
                    job
                );
            default:
                this.sessionProcessorService.processUnknown(job.name);
        }
    }
}

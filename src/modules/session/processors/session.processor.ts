import { EnumSessionProcess } from '@modules/session/enums/session.enum';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { SessionProcessorService } from '@modules/session/services/session.processor.service';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Consumes the session queue; currently only the revoked-login cache purge.
 */
@QueueProcessor(EnumQueue.session)
export class SessionProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        private readonly sessionProcessorService: SessionProcessorService
    ) {
        super(sentryService);
    }

    /** Dispatches each job to its handler by job name. */
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

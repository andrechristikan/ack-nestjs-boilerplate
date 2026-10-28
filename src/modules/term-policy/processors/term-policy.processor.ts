import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import type { ITermPolicyDeleteContentPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyProcessorService } from '@modules/term-policy/services/term-policy.processor.service';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Consumes the term-policy queue; currently only the draft content delete.
 */
@QueueProcessor(EnumQueue.termPolicy)
export class TermPolicyProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        private readonly termPolicyProcessorService: TermPolicyProcessorService
    ) {
        super(sentryService);
    }

    /** Dispatches each job to its handler by job name. */
    protected async handle(
        job: Job<
            ITermPolicyDeleteContentPayload,
            IQueueResponse,
            EnumTermPolicyProcess
        >
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumTermPolicyProcess.deleteContent:
                return await this.termPolicyProcessorService.processDeleteContent(
                    job
                );
            default:
                this.termPolicyProcessorService.processUnknown(job.name);
        }
    }
}

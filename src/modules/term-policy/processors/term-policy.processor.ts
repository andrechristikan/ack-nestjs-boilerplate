import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import type {
    ITermPolicyCopyContentPayload,
    ITermPolicyDeleteContentPayload,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyProcessorService } from '@modules/term-policy/services/processor/term-policy.processor.service';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Consumes the term-policy queue: the draft content delete and the published content copy.
 */
@QueueProcessor(EnumQueue.termPolicy)
export class TermPolicyProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        private readonly termPolicyProcessorService: TermPolicyProcessorService
    ) {
        super(sentryService, messageService);
    }

    /** Dispatches each job to its handler by job name. */
    protected async handle(
        job: Job<unknown, IQueueResponse, EnumTermPolicyProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumTermPolicyProcess.deleteContent:
                return await this.termPolicyProcessorService.processDeleteContent(
                    job as Job<
                        ITermPolicyDeleteContentPayload,
                        IQueueResponse,
                        EnumTermPolicyProcess
                    >
                );
            case EnumTermPolicyProcess.copyContent:
                return await this.termPolicyProcessorService.processCopyContent(
                    job as Job<
                        ITermPolicyCopyContentPayload,
                        IQueueResponse,
                        EnumTermPolicyProcess
                    >
                );
            default:
                this.termPolicyProcessorService.processUnknown(job.name);
        }
    }
}

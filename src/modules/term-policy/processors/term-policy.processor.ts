import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import type {
    ITermPolicyCopyContentPayload,
    ITermPolicyDeleteContentPayload,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyProcessCopyContentUseCase } from '@modules/term-policy/use-cases/term-policy.process-copy-content.use-case';
import { TermPolicyProcessDeleteContentUseCase } from '@modules/term-policy/use-cases/term-policy.process-delete-content.use-case';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumTermPolicyQueue } from '@modules/term-policy/enums/term-policy.enum';
import { QueueException } from '@queues/exceptions/queue.exception';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@QueueProcessor(EnumTermPolicyQueue.termPolicy)
export class TermPolicyProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        private readonly termPolicyProcessDeleteContentUseCase: TermPolicyProcessDeleteContentUseCase,
        private readonly termPolicyProcessCopyContentUseCase: TermPolicyProcessCopyContentUseCase
    ) {
        super(sentryService, messageService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumTermPolicyProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumTermPolicyProcess.deleteContent:
                return await this.termPolicyProcessDeleteContentUseCase.execute(
                    job as Job<
                        ITermPolicyDeleteContentPayload,
                        IQueueResponse,
                        EnumTermPolicyProcess
                    >
                );
            case EnumTermPolicyProcess.copyContent:
                return await this.termPolicyProcessCopyContentUseCase.execute(
                    job as Job<
                        ITermPolicyCopyContentPayload,
                        IQueueResponse,
                        EnumTermPolicyProcess
                    >
                );
            default: {
                const message = this.messageService.setMessage(
                    'termPolicy.queue.error.unknownProcess',
                    { properties: { process: job.name } }
                );

                throw new QueueException(message, true);
            }
        }
    }
}

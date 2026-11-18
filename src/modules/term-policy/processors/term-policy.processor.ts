import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import type {
    ITermPolicyBulkQueuePayload,
    ITermPolicyDeleteContentPayload,
    ITermPolicyPublishPayload,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyProcessDeleteContentUseCase } from '@modules/term-policy/use-cases/term-policy.process-delete-content.use-case';
import { TermPolicyProcessPublishUseCase } from '@modules/term-policy/use-cases/term-policy.process-publish.use-case';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { EnumTermPolicyQueue } from '@modules/term-policy/enums/term-policy.enum';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';

@QueueProcessor(EnumTermPolicyQueue.termPolicy)
export class TermPolicyProcessor extends QueueProcessorBase {
    constructor(
        private readonly termPolicyProcessDeleteContentUseCase: TermPolicyProcessDeleteContentUseCase,
        private readonly termPolicyProcessPublishUseCase: TermPolicyProcessPublishUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumTermPolicyProcess>,
        data: unknown
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumTermPolicyProcess.deleteContent:
                return await this.termPolicyProcessDeleteContentUseCase.execute(
                    data as ITermPolicyDeleteContentPayload
                );
            case EnumTermPolicyProcess.publish:
                return await this.termPolicyProcessPublishUseCase.execute(
                    data as ITermPolicyBulkQueuePayload<ITermPolicyPublishPayload>
                );
            default:
                this.throwUnknownProcess(
                    'termPolicy.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}

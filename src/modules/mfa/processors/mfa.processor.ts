import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { EnumMfaProcess, EnumMfaQueue } from '@modules/mfa/enums/mfa.enum';
import { MfaProcessPurgeExpiredUseCase } from '@modules/mfa/use-cases/mfa.process-purge-expired.use-case';
import { Job } from 'bullmq';

@QueueProcessor(EnumMfaQueue.mfa)
export class MfaProcessor extends QueueProcessorBase {
    constructor(
        private readonly mfaProcessPurgeExpiredUseCase: MfaProcessPurgeExpiredUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumMfaProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumMfaProcess.purgeExpired:
                return await this.mfaProcessPurgeExpiredUseCase.execute();
            default:
                this.throwUnknownProcess(
                    'mfa.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}

import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import {
    EnumPasswordHistoryProcess,
    EnumPasswordHistoryQueue,
} from '@modules/password-history/enums/password-history.enum';
import { PasswordHistoryProcessPurgeExpiredUseCase } from '@modules/password-history/use-cases/password-history.process-purge-expired.use-case';
import { Job } from 'bullmq';

@QueueProcessor(EnumPasswordHistoryQueue.passwordHistory)
export class PasswordHistoryProcessor extends QueueProcessorBase {
    constructor(
        private readonly passwordHistoryProcessPurgeExpiredUseCase: PasswordHistoryProcessPurgeExpiredUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumPasswordHistoryProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumPasswordHistoryProcess.purgeExpired:
                return await this.passwordHistoryProcessPurgeExpiredUseCase.execute();
            default:
                this.throwUnknownProcess(
                    'passwordHistory.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}

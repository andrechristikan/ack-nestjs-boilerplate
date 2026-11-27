import { Job } from 'bullmq';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import {
    EnumUserAuthProcess,
    EnumUserQueue,
} from '@modules/user/enums/user.enum';
import { UserProcessPurgeExpiredUseCase } from '@modules/user/use-cases/user.process-purge-expired.use-case';

@QueueProcessor(EnumUserQueue.userAuth)
export class UserAuthProcessor extends QueueProcessorBase {
    constructor(
        private readonly userProcessPurgeExpiredUseCase: UserProcessPurgeExpiredUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumUserAuthProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumUserAuthProcess.purgeExpired:
                return await this.userProcessPurgeExpiredUseCase.execute();
            default:
                this.throwUnknownProcess(
                    'user.queue.auth.error.unknownProcess',
                    job.name
                );
        }
    }
}

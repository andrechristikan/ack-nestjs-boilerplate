import { Job } from 'bullmq';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import {
    EnumUserAuthProcess,
    EnumUserQueue,
} from '@modules/user/enums/user.enum';
import type { IUserPurgeLoginsPayload } from '@modules/user/interfaces/user.interface';
import { UserProcessPurgeExpiredUseCase } from '@modules/user/use-cases/user.process-purge-expired.use-case';
import { UserProcessPurgeLoginsUseCase } from '@modules/user/use-cases/user.process-purge-logins.use-case';

@QueueProcessor(EnumUserQueue.userAuth)
export class UserAuthProcessor extends QueueProcessorBase {
    constructor(
        private readonly userProcessPurgeLoginsUseCase: UserProcessPurgeLoginsUseCase,
        private readonly userProcessPurgeExpiredUseCase: UserProcessPurgeExpiredUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumUserAuthProcess>,
        data: unknown
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumUserAuthProcess.purgeLogins:
                return await this.userProcessPurgeLoginsUseCase.execute(
                    data as IUserPurgeLoginsPayload
                );
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

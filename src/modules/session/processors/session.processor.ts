import { EnumSessionProcess } from '@modules/session/enums/session.enum';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { SessionProcessPurgeLoginsUseCase } from '@modules/session/use-cases/session.process-purge-logins.use-case';
import { Job } from 'bullmq';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { EnumSessionQueue } from '@modules/session/enums/session.enum';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';

@QueueProcessor(EnumSessionQueue.session)
export class SessionProcessor extends QueueProcessorBase {
    constructor(
        private readonly sessionProcessPurgeLoginsUseCase: SessionProcessPurgeLoginsUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumSessionProcess>,
        data: unknown
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumSessionProcess.purgeLogins:
                return await this.sessionProcessPurgeLoginsUseCase.execute(
                    data as ISessionPurgeLoginsPayload
                );
            default:
                this.throwUnknownProcess(
                    'session.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}

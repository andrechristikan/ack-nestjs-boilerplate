import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import type {
    IUserDeletePhotoPayload,
    IUserImportByAdminPayload,
} from '@modules/user/interfaces/user.interface';
import { UserProcessDeletePhotoUseCase } from '@modules/user/use-cases/user.process-delete-photo.use-case';
import { UserProcessImportByAdminUseCase } from '@modules/user/use-cases/user.process-import-by-admin.use-case';
import { Job, UnrecoverableError } from 'bullmq';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { EnumUserQueue } from '@modules/user/enums/user.enum';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';

@QueueProcessor(EnumUserQueue.user)
export class UserProcessor extends QueueProcessorBase {
    constructor(
        private readonly userProcessDeletePhotoUseCase: UserProcessDeletePhotoUseCase,
        private readonly userProcessImportByAdminUseCase: UserProcessImportByAdminUseCase
    ) {
        super();
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumUserProcess>,
        data: unknown,
        outboxId: string | null
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumUserProcess.deletePhoto:
                try {
                    return await this.userProcessDeletePhotoUseCase.execute(
                        data as IUserDeletePhotoPayload
                    );
                } catch (error: unknown) {
                    if (error instanceof QueueException) {
                        if (error.isFatal) {
                            const unrecoverable = new UnrecoverableError(
                                error.message
                            );
                            unrecoverable.cause = error;

                            throw unrecoverable;
                        }

                        throw error;
                    }

                    if (error instanceof AppBaseException) {
                        throw error;
                    }

                    this.throwUnknownException(error);
                }
            case EnumUserProcess.importByAdmin: {
                if (outboxId === null) {
                    this.throwUnrecoverable('user.queue.error.outboxIdMissing');
                }

                return await this.userProcessImportByAdminUseCase.execute(
                    outboxId,
                    data as IUserImportByAdminPayload
                );
            }
            default:
                this.throwUnknownProcess(
                    'user.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}

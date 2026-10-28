import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import type { IUserDeletePhotoPayload } from '@modules/user/interfaces/user.interface';
import { UserProcessorService } from '@modules/user/services/user.processor.service';
import { Job, UnrecoverableError } from 'bullmq';
import { QueueException } from '@queues/exceptions/queue.exception';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Consumes the user queue; currently only the replaced profile photo delete.
 */
@QueueProcessor(EnumQueue.user)
export class UserProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        private readonly userProcessorService: UserProcessorService
    ) {
        super(sentryService);
    }

    /** Dispatches each job to its handler by job name. */
    protected async handle(
        job: Job<IUserDeletePhotoPayload, IQueueResponse, EnumUserProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumUserProcess.deletePhoto:
                try {
                    return await this.userProcessorService.processDeletePhoto(
                        job
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

                    throw new AppUnknownException(error);
                }
            default:
                this.userProcessorService.processUnknown(job.name);
        }
    }
}

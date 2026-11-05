import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import type {
    IUserDeletePhotoPayload,
    IUserLockoutPayload,
} from '@modules/user/interfaces/user.interface';
import { UserProcessorService } from '@modules/user/services/processor/user.processor.service';
import { Job, UnrecoverableError } from 'bullmq';
import { QueueException } from '@queues/exceptions/queue.exception';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Consumes the user queue: the replaced profile photo delete and the lockout of a user that spent its attempt budget.
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
        job: Job<unknown, IQueueResponse, EnumUserProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumUserProcess.deletePhoto:
                try {
                    return await this.userProcessorService.processDeletePhoto(
                        job as Job<
                            IUserDeletePhotoPayload,
                            IQueueResponse,
                            EnumUserProcess
                        >
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
            case EnumUserProcess.lockout: {
                const { userId } = (
                    job as Job<
                        IUserLockoutPayload,
                        IQueueResponse,
                        EnumUserProcess
                    >
                ).data;

                return await this.userProcessorService.lockout(userId);
            }
            default:
                this.userProcessorService.processUnknown(job.name);
        }
    }
}

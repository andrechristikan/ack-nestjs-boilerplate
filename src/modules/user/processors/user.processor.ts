import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import type {
    IUserDeletePhotoPayload,
    IUserLockoutPayload,
} from '@modules/user/interfaces/user.interface';
import { UserProcessDeletePhotoUseCase } from '@modules/user/use-cases/user.process-delete-photo.use-case';
import { UserProcessLockoutUseCase } from '@modules/user/use-cases/user.process-lockout.use-case';
import { Job, UnrecoverableError } from 'bullmq';
import { QueueException } from '@queues/exceptions/queue.exception';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumUserQueue } from '@modules/user/enums/user.enum';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@QueueProcessor(EnumUserQueue.user)
export class UserProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        private readonly userProcessDeletePhotoUseCase: UserProcessDeletePhotoUseCase,
        private readonly userProcessLockoutUseCase: UserProcessLockoutUseCase
    ) {
        super(sentryService, messageService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumUserProcess>
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumUserProcess.deletePhoto:
                try {
                    return await this.userProcessDeletePhotoUseCase.execute(
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

                    this.throwUnknownException(error);
                }
            case EnumUserProcess.lockout: {
                const { userId } = (
                    job as Job<
                        IUserLockoutPayload,
                        IQueueResponse,
                        EnumUserProcess
                    >
                ).data;

                return await this.userProcessLockoutUseCase.execute(userId);
            }
            default: {
                const message = this.messageService.setMessage(
                    'user.queue.error.unknownProcess',
                    { properties: { process: job.name } }
                );

                throw new QueueException(message, true);
            }
        }
    }
}

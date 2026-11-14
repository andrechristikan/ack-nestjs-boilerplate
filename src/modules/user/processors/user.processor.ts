import { CacheService } from '@common/cache/services/cache.service';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import type {
    IUserDeletePhotoPayload,
    IUserImportByAdminPayload,
    IUserLockoutPayload,
} from '@modules/user/interfaces/user.interface';
import { UserProcessDeletePhotoUseCase } from '@modules/user/use-cases/user.process-delete-photo.use-case';
import { UserProcessImportByAdminUseCase } from '@modules/user/use-cases/user.process-import-by-admin.use-case';
import { UserProcessLockoutUseCase } from '@modules/user/use-cases/user.process-lockout.use-case';
import { Job, UnrecoverableError } from 'bullmq';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { EnumUserQueue } from '@modules/user/enums/user.enum';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';

@QueueProcessor(EnumUserQueue.user)
export class UserProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        protected readonly cacheService: CacheService,
        protected readonly outboxService: OutboxService,
        private readonly userProcessDeletePhotoUseCase: UserProcessDeletePhotoUseCase,
        private readonly userProcessLockoutUseCase: UserProcessLockoutUseCase,
        private readonly userProcessImportByAdminUseCase: UserProcessImportByAdminUseCase
    ) {
        super(sentryService, messageService, cacheService, outboxService);
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
            case EnumUserProcess.lockout: {
                const { userId } = data as IUserLockoutPayload;

                return await this.userProcessLockoutUseCase.execute(userId);
            }
            case EnumUserProcess.importByAdmin: {
                if (outboxId === null) {
                    const message = this.messageService.setMessage(
                        'user.queue.error.outboxIdMissing'
                    );
                    throw new UnrecoverableError(message);
                }

                return await this.userProcessImportByAdminUseCase.execute(
                    outboxId,
                    data as IUserImportByAdminPayload
                );
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

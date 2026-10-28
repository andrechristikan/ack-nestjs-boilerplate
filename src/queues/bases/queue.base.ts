import { Logger } from '@nestjs/common';
import type { JobsOptions, Queue } from 'bullmq';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueSideEffectFailedException } from '@queues/exceptions/queue.side-effect-failed.exception';
import type {
    IQueueBulkJobs,
    IQueueJobData,
} from '@queues/interfaces/queue.interface';

/**
 * Base for queue classes; owns the post-commit enqueue that logs and reports a failure instead of throwing it.
 */
export abstract class QueueBase {
    private readonly logger = new Logger(QueueBase.name);

    constructor(
        protected readonly queue: Queue,
        protected readonly sentryService: SentryService
    ) {}

    private reportSideEffectFailure(error: unknown, description: string): void {
        const exception = new QueueSideEffectFailedException(
            description,
            error
        );

        this.logger.error(exception, description);
        this.sentryService.captureException(exception);
    }

    protected async addSideEffect(
        name: string,
        data: IQueueJobData,
        options: JobsOptions,
        description: string
    ): Promise<void> {
        try {
            await this.queue.add(name, data, options);
        } catch (error: unknown) {
            this.reportSideEffectFailure(error, description);
        }
    }

    protected async addBulkSideEffect(
        jobs: IQueueBulkJobs,
        description: string
    ): Promise<void> {
        try {
            await this.queue.addBulk(jobs);
        } catch (error: unknown) {
            this.reportSideEffectFailure(error, description);
        }
    }
}

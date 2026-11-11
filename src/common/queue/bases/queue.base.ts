import { Logger } from '@nestjs/common';
import type { JobsOptions, Queue } from 'bullmq';
import { CacheService } from '@common/cache/services/cache.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueSideEffectFailedException } from '@common/queue/exceptions/queue.side-effect-failed.exception';
import type {
    IQueueBulkJobs,
    IQueueJobData,
} from '@common/queue/interfaces/queue.interface';

export abstract class QueueBase {
    private readonly logger = new Logger(QueueBase.name);

    constructor(
        protected readonly queue: Queue,
        protected readonly sentryService: SentryService,
        protected readonly cacheService: CacheService
    ) {
        this.registerErrorListener();
    }

    private registerErrorListener(): void {
        this.queue.on('error', (error: Error) => this.onError(error));
    }

    private onError(error: Error): void {
        const isConnection = this.cacheService.isConnectionError(error);
        if (isConnection) {
            return;
        }

        this.logger.warn(error, 'Queue error');
    }

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

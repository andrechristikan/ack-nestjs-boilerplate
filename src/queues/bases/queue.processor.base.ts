import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueException } from '@queues/exceptions/queue.exception';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Base for queue processors; owns process/job.log and reports fatal job failures to Sentry.
 */
export abstract class QueueProcessorBase extends WorkerHost {
    private readonly logger = new Logger(QueueProcessorBase.name);

    constructor(protected readonly sentryService: SentryService) {
        super();
    }

    private async writeJobLog(job: Job, message: string): Promise<void> {
        try {
            await job.log(message);
        } catch (error: unknown) {
            this.logger.warn(
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    async process(job: Job): Promise<IQueueResponse> {
        const maxAttempts = job.opts.attempts ?? 1;

        await this.writeJobLog(job, 'Job started');
        await this.writeJobLog(
            job,
            `Job input id=${job.id} name=${job.name} attemptsMade=${job.attemptsMade} maxAttempts=${maxAttempts}`
        );

        try {
            const result = await this.handle(job);

            await this.writeJobLog(
                job,
                `Job finished ${JSON.stringify(result)}`
            );

            return result;
        } catch (error: unknown) {
            const failureMessage =
                error instanceof Error ? error.message : String(error);

            await this.writeJobLog(job, `Job failed ${failureMessage}`);

            this.logger.error(error, 'Queue job failed');

            throw error;
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<unknown, null, string>, error: Error): void {
        const maxAttempts = job.opts.attempts ?? 1;
        const isLastAttempt =
            error instanceof UnrecoverableError ||
            error.name === 'UnrecoverableError' ||
            job.attemptsMade >= maxAttempts;

        if (!isLastAttempt) {
            return;
        }

        let isFatal = true;

        if (error instanceof QueueException) {
            isFatal = !!error.isFatal;
        }

        if (!isFatal) {
            return;
        }

        const sentryService = this.sentryService;

        sentryService.withScope(scope => {
            scope.setAttribute('job.id', String(job.id));
            scope.setAttribute('job.name', job.name);
            scope.setAttribute('job.attemptsMade', job.attemptsMade);
            scope.setAttribute('job.maxAttempts', maxAttempts);
            sentryService.captureException(error);
        });
    }

    protected abstract handle(job: Job): Promise<IQueueResponse>;
}

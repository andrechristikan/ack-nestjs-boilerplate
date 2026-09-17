import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueException } from '@queues/exceptions/queue.exception';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Base for queue processors; reports fatal job failures to Sentry.
 */
export abstract class QueueProcessorBase extends WorkerHost {
    constructor(protected readonly sentryService: SentryService) {
        super();
    }

    /**
     * Captures the error in Sentry once, when BullMQ will not retry the job (final attempt or
     * unrecoverable failure), and only when fatal. `attemptsMade` already counts the failed attempt
     * when `failed` fires.
     */
    @OnWorkerEvent('failed')
    onFailed(job: Job<unknown, null, string>, error: Error): void {
        const maxAttempts = job.opts.attempts ?? 1;
        const isLastAttempt =
            error instanceof UnrecoverableError ||
            error.name === 'UnrecoverableError' ||
            job.attemptsMade >= maxAttempts;

        if (isLastAttempt) {
            let isFatal = true;

            if (error instanceof QueueException) {
                isFatal = !!error.isFatal;
            }

            if (isFatal) {
                this.sentryService.captureException(error);
            }
        }
    }

    abstract process(job: Job): Promise<IQueueResponse>;
}

import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import * as Sentry from '@sentry/nestjs';
import { Job } from 'bullmq';
import { QueueException } from 'src/queues/exceptions/queue.exception';

/**
 * Base class for queue processors that extends WorkerHost functionality.
 * Provides common error handling and Sentry integration for failed jobs.
 */
export abstract class QueueProcessorBase extends WorkerHost {
    /**
     * Handles failed job events and reports fatal errors to Sentry.
     * Only reports to Sentry on the last attempt for fatal errors.
     *
     * @param {Job<unknown, null, string> | undefined} job - The failed job instance
     * @param {Error} error - The error that caused the job to fail
     * @returns {void}
     */
    @OnWorkerEvent('failed')
    onFailed(job: Job<unknown, null, string> | undefined, error: Error): void {
        const maxAttempts = job.opts.attempts ?? 1;
        const isLastAttempt = job.attemptsMade >= maxAttempts - 1;

        if (isLastAttempt) {
            let isFatal = true;

            if (error instanceof QueueException) {
                isFatal = !!error.isFatal;
            }

            if (isFatal) {
                try {
                    Sentry.captureException(error);
                } catch (_) {}
            }
        }
    }
}

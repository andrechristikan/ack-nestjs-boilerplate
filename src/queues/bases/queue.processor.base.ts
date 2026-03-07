import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import * as Sentry from '@sentry/nestjs';
import { Job } from 'bullmq';
import { QueueException } from 'src/queues/exceptions/queue.exception';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

/**
 * Base class for all queue job processors.
 * Provides common error handling and Sentry integration for job failures.
 * Extend this class when creating new processor classes.
 */
export abstract class QueueProcessorBase extends WorkerHost {
    /**
     * Handles failed job events and reports fatal errors to Sentry.
     * Only reports on the last retry attempt to avoid duplicate error reports.
     *
     * @param job - The failed job instance
     * @param error - The error that caused the job to fail
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

    /**
     * Abstract method that must be implemented by all processor subclasses.
     * Processes a single job from the queue.
     *
     * @param job - The BullMQ job to process
     * @returns Queue response with success/failure status
     */
    abstract process(job: Job): Promise<IQueueResponse>;
}

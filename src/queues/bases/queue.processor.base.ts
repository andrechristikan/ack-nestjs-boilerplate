import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import * as Sentry from '@sentry/nestjs';
import { Job } from 'bullmq';
import { QueueException } from '@queues/exceptions/queue.exception';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/**
 * Base for queue processors; reports fatal job failures to Sentry.
 */
export abstract class QueueProcessorBase extends WorkerHost {
    /**
     * Captures the error in Sentry only on the last attempt and only when fatal,
     * avoiding duplicate reports across retries.
     */
    @OnWorkerEvent('failed')
    onFailed(job: Job<unknown, null, string>, error: Error): void {
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

    abstract process(job: Job): Promise<IQueueResponse>;
}

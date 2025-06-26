import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import * as Sentry from '@sentry/nestjs';
import { Job } from 'bullmq';
import { WorkerException } from 'src/worker/exceptions/worker.exception';

export abstract class WorkerBase extends WorkerHost {
    @OnWorkerEvent('failed')
    onFailed(job: Job<any, null, string> | undefined, error: Error) {
        const maxAttempts = job.opts.attempts || 1;
        const isLastAttempt = job.attemptsMade >= maxAttempts - 1;

        if (isLastAttempt) {
            let isFatal = true;

            if (error instanceof WorkerException) {
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

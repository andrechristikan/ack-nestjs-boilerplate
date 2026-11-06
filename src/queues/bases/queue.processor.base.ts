import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueException } from '@queues/exceptions/queue.exception';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

export abstract class QueueProcessorBase extends WorkerHost {
    private readonly logger = new Logger(QueueProcessorBase.name);

    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService
    ) {
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

    protected abstract handle(job: Job): Promise<IQueueResponse>;

    protected throwUnknownException(error: unknown): never {
        const message = this.messageService.setMessage('queue.error.unknown');

        throw new QueueException(message, true, error);
    }

    async process(job: Job): Promise<IQueueResponse> {
        const maxAttempts = job.opts.attempts ?? 1;

        // Sequential by design: side effects whose order is part of the contract
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

            if (
                error instanceof QueueException ||
                error instanceof AppBaseException ||
                error instanceof UnrecoverableError
            ) {
                throw error;
            }

            this.throwUnknownException(error);
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<unknown, null, string> | undefined, error: Error): void {
        if (!job) {
            this.sentryService.captureException(error);

            return;
        }

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

        this.sentryService.captureException(error, {
            tags: { 'job.name': job.name },
            contexts: {
                job: {
                    id: String(job.id),
                    name: job.name,
                    attemptsMade: job.attemptsMade,
                    maxAttempts,
                },
            },
        });
    }
}

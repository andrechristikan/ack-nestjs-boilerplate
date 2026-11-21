import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import type { Prisma } from '@generated/prisma-client/client';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { CacheService } from '@common/cache/services/cache.service';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type { IOutboxJobPayload } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';

export abstract class QueueProcessorBase extends WorkerHost {
    private readonly logger = new Logger(QueueProcessorBase.name);

    @Inject(SentryService)
    protected readonly sentryService: SentryService;

    @Inject(MessageService)
    protected readonly messageService: MessageService;

    @Inject(CacheService)
    protected readonly cacheService: CacheService;

    @Inject(OutboxService)
    protected readonly outboxService: OutboxService;

    private async writeJobLog(job: Job, message: string): Promise<void> {
        try {
            await job.log(message);
        } catch (error: unknown) {
            this.logger.warn(
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    private getOutboxId(job: Job): string | null {
        const data: unknown = job.data;
        if (
            typeof data !== 'object' ||
            data === null ||
            !('outboxId' in data)
        ) {
            return null;
        }

        return (data as IOutboxJobPayload).outboxId;
    }

    private async loadData(
        job: Job,
        outboxId: string | null
    ): Promise<Prisma.JsonValue> {
        if (outboxId === null) {
            return job.data;
        }

        const row = await this.outboxService.load(outboxId);
        if (row === null) {
            const message = this.messageService.setMessage(
                'outbox.queue.error.rowMissing',
                { properties: { outboxId } }
            );

            throw new UnrecoverableError(message);
        }

        return row.data;
    }

    private async completeRow(
        outboxId: string,
        attempts: number
    ): Promise<void> {
        try {
            await this.outboxService.complete(outboxId, attempts);
        } catch (error: unknown) {
            this.logger.warn(
                { outboxId, err: error },
                'Outbox row complete stamp failed'
            );
        }
    }

    private async failRow(
        outboxId: string,
        attempts: number,
        lastError: string
    ): Promise<void> {
        try {
            await this.outboxService.fail(outboxId, attempts, lastError);
        } catch (error: unknown) {
            this.logger.warn(
                { outboxId, err: error },
                'Outbox row fail stamp failed'
            );
        }
    }

    protected abstract handle(
        job: Job,
        data: unknown,
        outboxId: string | null
    ): Promise<IQueueResponse>;

    protected throwUnknownException(error: unknown): never {
        const message = this.messageService.setMessage('queue.error.unknown');

        throw new QueueException(message, true, error);
    }

    protected throwUnknownProcess(messagePath: string, process: string): never {
        const message = this.messageService.setMessage(messagePath, {
            properties: { process },
        });

        throw new QueueException(message, true);
    }

    protected throwUnrecoverable(messagePath: string): never {
        const message = this.messageService.setMessage(messagePath);

        throw new UnrecoverableError(message);
    }

    async process(job: Job): Promise<IQueueResponse> {
        const maxAttempts = job.opts.attempts ?? 1;
        const outboxId = this.getOutboxId(job);

        // Sequential by design: a write after its checks; side effects whose order is part of the contract
        await this.writeJobLog(job, 'Job started');
        await this.writeJobLog(
            job,
            `Job input id=${job.id} name=${job.name} attemptsMade=${job.attemptsMade} maxAttempts=${maxAttempts}`
        );

        let rowId: string | null = null;
        let result: IQueueResponse;
        try {
            const data = await this.loadData(job, outboxId);
            rowId = outboxId;
            result = await this.handle(job, data, outboxId);

            await this.writeJobLog(
                job,
                `Job finished ${JSON.stringify(result)}`
            );
        } catch (error: unknown) {
            const failureMessage =
                error instanceof Error ? error.message : String(error);

            await this.writeJobLog(job, `Job failed ${failureMessage}`);

            this.logger.error(error, 'Queue job failed');

            const attempts = job.attemptsMade + 1;
            const isLastAttempt =
                error instanceof UnrecoverableError || attempts >= maxAttempts;
            if (rowId !== null && isLastAttempt) {
                await this.failRow(rowId, attempts, failureMessage);
            }

            if (
                error instanceof QueueException ||
                error instanceof AppBaseException ||
                error instanceof UnrecoverableError
            ) {
                throw error;
            }

            this.throwUnknownException(error);
        }

        if (rowId !== null) {
            await this.completeRow(rowId, job.attemptsMade + 1);
        }

        return result;
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

    @OnWorkerEvent('error')
    onError(error: Error): void {
        const isConnection = this.cacheService.isConnectionError(error);
        if (isConnection) {
            return;
        }

        this.logger.warn(error, 'Queue worker error');
    }
}

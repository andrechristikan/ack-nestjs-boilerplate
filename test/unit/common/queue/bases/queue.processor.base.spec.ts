import { Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { EnumOutboxStatus } from '@generated/prisma-client/client';
import type { Outbox } from '@generated/prisma-client/client';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Mock } from 'vitest';
import { CacheService } from '@common/cache/services/cache.service';
import { MessageService } from '@common/message/services/message.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { QueueUnrecoverableException } from '@common/queue/exceptions/queue.unrecoverable.exception';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { OutboxService } from '@common/outbox/services/outbox.service';
import {
    buildProcessorJob,
    buildQueueProcessor,
} from '@test/unit/helpers/test.unit.queue.helper';

describe('QueueProcessorBase', () => {
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    let handle: Mock;
    const jobName = 'testJob';
    let processor: QueueProcessorBase;

    beforeEach(() => {
        messageService.setMessage.mockImplementation((path: string) => path);

        ({ processor, handle } = buildQueueProcessor(
            sentryService,
            messageService,
            cacheService,
            outboxService
        ));
    });

    describe('process', () => {
        const outboxId = 'outbox-1';
        const rowData = { userId: 'user-1', sessions: [] };
        const row: Outbox = {
            id: outboxId,
            queue: 'session',
            name: 'purgeLogins',
            data: rowData,
            priority: 1,
            idempotencyKey: outboxId,
            status: EnumOutboxStatus.enqueued,
            attempts: 0,
            lastError: null,
            enqueuedAt: new Date('2026-11-11T00:00:00.000Z'),
            sweptAt: null,
            completedAt: null,
            failedAt: null,
            createdAt: new Date('2026-11-11T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-11-11T00:00:00.000Z'),
            updatedBy: null,
        };

        it('loads the outbox row, passes its data to the handler and stamps it completed with the attempt count', async () => {
            const job = buildProcessorJob({
                data: { outboxId },
                opts: { attempts: 3 },
                attemptsMade: 1,
            });
            outboxService.load.mockResolvedValue(row);
            handle.mockResolvedValue({ message: 'done' });

            const result = await processor.process(job);

            expect(result).toEqual({ message: 'done' });
            expect(outboxService.load).toHaveBeenCalledWith(outboxId);
            expect(handle).toHaveBeenCalledWith(job, rowData, outboxId);
            expect(outboxService.complete).toHaveBeenCalledWith(outboxId, 2);
        });

        it('logs the start, input and success lines and returns the handler result', async () => {
            const job = buildProcessorJob({
                opts: { attempts: 3 },
                attemptsMade: 0,
            });
            handle.mockResolvedValue({ message: 'done' });

            const result = await processor.process(job);

            expect(result).toEqual({ message: 'done' });
            expect(job.log).toHaveBeenNthCalledWith(1, 'Job started');
            expect(job.log).toHaveBeenNthCalledWith(
                2,
                'Job input id=job-1 name=testJob attemptsMade=0 maxAttempts=3'
            );
            expect(job.log).toHaveBeenNthCalledWith(
                3,
                'Job finished {"message":"done"}'
            );
        });

        it('stamps nothing when the handler fails before the last attempt', async () => {
            const job = buildProcessorJob({
                data: { outboxId },
                opts: { attempts: 3 },
                attemptsMade: 0,
            });
            const error = new QueueException('send failed', true);
            outboxService.load.mockResolvedValue(row);
            handle.mockRejectedValue(error);

            await expect(processor.process(job)).rejects.toBe(error);

            expect(outboxService.fail).not.toHaveBeenCalled();
            expect(outboxService.complete).not.toHaveBeenCalled();
        });

        it('stamps the row failed with the attempts and the message on the last attempt', async () => {
            const job = buildProcessorJob({
                data: { outboxId },
                opts: { attempts: 3 },
                attemptsMade: 2,
            });
            const error = new QueueException('send failed', true);
            outboxService.load.mockResolvedValue(row);
            handle.mockRejectedValue(error);

            await expect(processor.process(job)).rejects.toBe(error);

            expect(outboxService.fail).toHaveBeenCalledWith(
                outboxId,
                3,
                'send failed'
            );
            expect(outboxService.complete).not.toHaveBeenCalled();
        });

        it('stamps the row failed on an UnrecoverableError before the last attempt', async () => {
            const job = buildProcessorJob({
                data: { outboxId },
                opts: { attempts: 3 },
                attemptsMade: 0,
            });
            const error = new UnrecoverableError('hopeless');
            outboxService.load.mockResolvedValue(row);
            handle.mockRejectedValue(error);

            await expect(processor.process(job)).rejects.toBe(error);

            expect(outboxService.fail).toHaveBeenCalledWith(
                outboxId,
                1,
                'hopeless'
            );
        });

        it('rethrows the handler error when stamping the row failed throws', async () => {
            const job = buildProcessorJob({
                data: { outboxId },
                opts: { attempts: 1 },
                attemptsMade: 0,
            });
            const error = new QueueException('send failed', true);
            outboxService.load.mockResolvedValue(row);
            outboxService.fail.mockRejectedValue(new Error('mongo down'));
            handle.mockRejectedValue(error);

            await expect(processor.process(job)).rejects.toBe(error);

            expect(outboxService.fail).toHaveBeenCalledWith(
                outboxId,
                1,
                'send failed'
            );
        });

        it('completes the job and leaves the row for the reconcile when stamping the row completed throws', async () => {
            const job = buildProcessorJob({ data: { outboxId } });
            outboxService.load.mockResolvedValue(row);
            outboxService.complete.mockRejectedValue(new Error('mongo down'));
            handle.mockResolvedValue({ message: 'done' });

            await expect(processor.process(job)).resolves.toEqual({
                message: 'done',
            });

            expect(outboxService.complete).toHaveBeenCalledWith(outboxId, 1);
            expect(outboxService.fail).not.toHaveBeenCalled();
        });

        it('fails with an UnrecoverableError and stamps nothing when the outbox row is missing', async () => {
            const job = buildProcessorJob({ data: { outboxId } });
            outboxService.load.mockResolvedValue(null);

            await expect(processor.process(job)).rejects.toMatchObject({
                constructor: UnrecoverableError,
                message: 'outbox.queue.error.rowMissing',
            });

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'outbox.queue.error.rowMissing',
                { properties: { outboxId } }
            );
            expect(handle).not.toHaveBeenCalled();
            expect(outboxService.complete).not.toHaveBeenCalled();
            expect(outboxService.fail).not.toHaveBeenCalled();
        });

        it('passes the job data to the handler and stamps nothing when the job carries no outboxId', async () => {
            const job = buildProcessorJob({ data: rowData });
            handle.mockResolvedValue({ message: 'done' });

            await processor.process(job);

            expect(handle).toHaveBeenCalledWith(job, rowData, null);
            expect(outboxService.load).not.toHaveBeenCalled();
            expect(outboxService.complete).not.toHaveBeenCalled();
            expect(outboxService.fail).not.toHaveBeenCalled();
        });

        it('defaults maxAttempts to 1 when the job carries no attempts option', async () => {
            const job = buildProcessorJob({ opts: {}, attemptsMade: 0 });
            handle.mockResolvedValue({ message: 'done' });

            await processor.process(job);

            expect(job.log).toHaveBeenNthCalledWith(
                2,
                'Job input id=job-1 name=testJob attemptsMade=0 maxAttempts=1'
            );
        });

        it('logs the failure line and wraps an Error raised by the handler in a fatal QueueException', async () => {
            const job = buildProcessorJob({});
            const error = new Error('handle failed');
            handle.mockRejectedValue(error);

            await expect(processor.process(job)).rejects.toMatchObject({
                constructor: QueueException,
                message: 'queue.error.unknown',
                isFatal: true,
                rawError: error,
                cause: error,
            });

            expect(job.log).toHaveBeenNthCalledWith(
                3,
                'Job failed handle failed'
            );
        });

        it('logs the failure line with String(error) and wraps a non-Error raised by the handler', async () => {
            const job = buildProcessorJob({});
            handle.mockRejectedValue('raw failure reason');

            await expect(processor.process(job)).rejects.toMatchObject({
                constructor: QueueException,
                rawError: 'raw failure reason',
                cause: 'raw failure reason',
            });

            expect(job.log).toHaveBeenNthCalledWith(
                3,
                'Job failed raw failure reason'
            );
        });

        it('rethrows a QueueException raised by the handler unchanged', async () => {
            const job = buildProcessorJob({});
            const error = new QueueException('send failed', true);
            handle.mockRejectedValue(error);

            await expect(processor.process(job)).rejects.toBe(error);
        });

        it('rejects with an UnrecoverableError caused by the QueueUnrecoverableException and stamps the row failed on attempt 1 of 3', async () => {
            const job = buildProcessorJob({
                data: { outboxId },
                opts: { attempts: 3 },
                attemptsMade: 0,
            });
            const error = new QueueUnrecoverableException('hopeless');
            outboxService.load.mockResolvedValue(row);
            handle.mockRejectedValue(error);

            const result = processor.process(job);

            await expect(result).rejects.toBeInstanceOf(UnrecoverableError);
            await expect(result).rejects.toMatchObject({
                message: 'hopeless',
                cause: error,
            });
            expect(outboxService.fail).toHaveBeenCalledWith(
                outboxId,
                1,
                'hopeless'
            );
        });

        it('rejects with an UnrecoverableError caused by the HelperDecryptFailedException and stamps the row failed on attempt 1 of 3', async () => {
            const job = buildProcessorJob({
                data: { outboxId },
                opts: { attempts: 3 },
                attemptsMade: 0,
            });
            const error = new HelperDecryptFailedException();
            outboxService.load.mockResolvedValue(row);
            handle.mockRejectedValue(error);

            const result = processor.process(job);

            await expect(result).rejects.toBeInstanceOf(UnrecoverableError);
            await expect(result).rejects.toMatchObject({
                message: error.message,
                cause: error,
            });
            expect(outboxService.fail).toHaveBeenCalledWith(
                outboxId,
                1,
                error.message
            );
        });

        it('rethrows an AppBaseException raised by the handler unchanged', async () => {
            const job = buildProcessorJob({});
            const error = new RedisUnavailableException();
            handle.mockRejectedValue(error);

            await expect(processor.process(job)).rejects.toBe(error);
        });

        it('rethrows an UnrecoverableError raised by the handler unchanged', async () => {
            const job = buildProcessorJob({});
            const error = new UnrecoverableError('hopeless');
            handle.mockRejectedValue(error);

            await expect(processor.process(job)).rejects.toBe(error);
        });
    });

    describe('onFailed', () => {
        it('reports the error alone and returns when BullMQ hands over no job', () => {
            const error = new Error('boom');

            processor.onFailed(undefined, error);

            expect(sentryService.captureException).toHaveBeenCalledTimes(1);
            expect(sentryService.captureException).toHaveBeenCalledWith(
                error,
                null
            );
        });

        it('reports to Sentry with the job tag and context when the error is an UnrecoverableError instance', () => {
            const job = buildProcessorJob({ opts: {}, attemptsMade: 0 });
            const error = new UnrecoverableError('unrecoverable');

            processor.onFailed(job, error);

            expect(sentryService.captureException).toHaveBeenCalledWith(error, {
                tags: { 'job.name': jobName },
                contexts: {
                    job: {
                        id: 'job-1',
                        name: jobName,
                        attemptsMade: 0,
                        maxAttempts: 1,
                    },
                },
            });
        });

        it('reports an UnrecoverableError whose cause is a fatal QueueException', () => {
            const job = buildProcessorJob({ opts: {}, attemptsMade: 0 });
            const error = new UnrecoverableError('hopeless');
            error.cause = new QueueUnrecoverableException('hopeless', true);

            processor.onFailed(job, error);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                error,
                expect.objectContaining({
                    tags: { 'job.name': jobName },
                })
            );
        });

        it('skips an UnrecoverableError whose cause is a non-fatal QueueException', () => {
            const job = buildProcessorJob({ opts: {}, attemptsMade: 0 });
            const error = new UnrecoverableError('hopeless');
            error.cause = new QueueUnrecoverableException('hopeless', false);

            processor.onFailed(job, error);

            expect(sentryService.captureException).not.toHaveBeenCalled();
        });

        it('reports to Sentry when the error carries the UnrecoverableError name without being an instance', () => {
            const job = buildProcessorJob({
                opts: { attempts: 3 },
                attemptsMade: 0,
            });
            const error = new Error('boom');
            error.name = 'UnrecoverableError';

            processor.onFailed(job, error);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                error,
                expect.objectContaining({
                    tags: expect.any(Object),
                    contexts: expect.any(Object),
                })
            );
        });

        it('reports to Sentry on the final attempt for an ordinary error', () => {
            const job = buildProcessorJob({ opts: {}, attemptsMade: 1 });
            const error = new Error('boom');

            processor.onFailed(job, error);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                error,
                expect.objectContaining({
                    tags: expect.any(Object),
                    contexts: expect.any(Object),
                })
            );
        });

        it('does nothing when the attempt is not the last one', () => {
            const job = buildProcessorJob({
                opts: { attempts: 3 },
                attemptsMade: 0,
            });
            const error = new Error('boom');

            processor.onFailed(job, error);

            expect(sentryService.captureException).not.toHaveBeenCalled();
        });

        it('reports a fatal QueueException on the final attempt', () => {
            const job = buildProcessorJob({ opts: {}, attemptsMade: 1 });
            const error = new QueueException('boom', true);

            processor.onFailed(job, error);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                error,
                expect.objectContaining({
                    tags: expect.any(Object),
                    contexts: expect.any(Object),
                })
            );
        });

        it('does nothing for a non-fatal QueueException on the final attempt', () => {
            const job = buildProcessorJob({ opts: {}, attemptsMade: 1 });
            const error = new QueueException('boom', false);

            processor.onFailed(job, error);

            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });

    describe('onError', () => {
        it('logs a warning for a connection error without asking the cache service', () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('connect ECONNREFUSED 127.0.0.1:6379');

            expect(() => processor.onError(error)).not.toThrow();
            expect(cacheService.isConnectionError).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledWith(error, 'Queue worker error');
        });

        it('logs a warning for any other error', () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('worker failure');

            expect(() => processor.onError(error)).not.toThrow();
            expect(cacheService.isConnectionError).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledWith(error, 'Queue worker error');
        });
    });

    describe('throwUnknownException', () => {
        it('throws a fatal QueueException carrying the queue.error.unknown message and the error', () => {
            const error = new Error('boom');

            expect(() => processor['throwUnknownException'](error)).toThrow(
                expect.objectContaining({
                    constructor: QueueException,
                    message: 'queue.error.unknown',
                    isFatal: true,
                    rawError: error,
                    cause: error,
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'queue.error.unknown'
            );
        });
    });

    describe('throwUnknownProcess', () => {
        it('throws a fatal QueueException whose message is resolved with the process property', () => {
            const path = 'user.queue.error.unknownProcess';

            expect(() =>
                processor['throwUnknownProcess'](path, 'noSuchJob')
            ).toThrow(
                expect.objectContaining({
                    constructor: QueueException,
                    message: path,
                    isFatal: true,
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(path, {
                properties: { process: 'noSuchJob' },
            });
        });
    });

    describe('throwUnrecoverable', () => {
        it('throws an UnrecoverableError carrying the resolved message', () => {
            const path = 'user.queue.error.outboxIdMissing';

            expect(() => processor['throwUnrecoverable'](path)).toThrow(
                expect.objectContaining({
                    constructor: UnrecoverableError,
                    message: path,
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(path);
        });
    });

    describe('writeJobLog', () => {
        it('writes the message on the job', async () => {
            const job = buildProcessorJob({});

            await processor['writeJobLog'](job, 'a message');

            expect(job.log).toHaveBeenCalledWith('a message');
        });

        it('warns with the error first and the sentence second when job.log rejects', async () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('log failed');
            const job = buildProcessorJob({
                log: vi.fn().mockRejectedValue(error),
            });

            await processor['writeJobLog'](job, 'a message');

            expect(warn).toHaveBeenCalledWith(
                error,
                'Queue job log write failed'
            );
        });

        it('swallows an Error raised by job.log', async () => {
            const job = buildProcessorJob({
                log: vi.fn().mockRejectedValue(new Error('log failed')),
            });

            await expect(
                processor['writeJobLog'](job, 'a message')
            ).resolves.toBeUndefined();
        });

        it('swallows a non-Error rejection from job.log', async () => {
            const job = buildProcessorJob({
                log: vi.fn().mockRejectedValue('raw log failure'),
            });

            await expect(
                processor['writeJobLog'](job, 'a message')
            ).resolves.toBeUndefined();
        });
    });
});

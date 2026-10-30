import { UnrecoverableError } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Mock } from 'vitest';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { SentryService } from '@common/sentry/services/sentry.service';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';
import { QueueException } from '@queues/exceptions/queue.exception';
import {
    buildProcessorJob,
    buildQueueProcessor,
} from '@test/unit/helpers/test.unit.queue.helper';

describe('QueueProcessorBase', () => {
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    let handle: Mock;
    const jobName = 'testJob';
    let processor: QueueProcessorBase;

    beforeEach(() => {
        vi.resetAllMocks();

        ({ processor, handle } = buildQueueProcessor(sentryService));
    });

    describe('process', () => {
        it('logs the start, input and success lines and returns the handler result', async () => {
            const job = buildProcessorJob({
                opts: { attempts: 3 },
                attemptsMade: 0,
            });
            handle.mockResolvedValue({ message: 'done' });

            const result = await processor.process(job);

            expect(result).toEqual({ message: 'done' });
            expect(handle).toHaveBeenCalledWith(job);
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

        it('defaults maxAttempts to 1 when the job carries no attempts option', async () => {
            const job = buildProcessorJob({ opts: {}, attemptsMade: 0 });
            handle.mockResolvedValue({ message: 'done' });

            await processor.process(job);

            expect(job.log).toHaveBeenNthCalledWith(
                2,
                'Job input id=job-1 name=testJob attemptsMade=0 maxAttempts=1'
            );
        });

        it('logs the failure line and wraps an Error raised by the handler in AppUnknownException', async () => {
            const job = buildProcessorJob({});
            const error = new Error('handle failed');
            handle.mockRejectedValue(error);

            await expect(processor.process(job)).rejects.toMatchObject({
                constructor: AppUnknownException,
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: error,
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
                constructor: AppUnknownException,
                rawError: 'raw failure reason',
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

        it('rethrows an AppBaseException raised by the handler unchanged', async () => {
            const job = buildProcessorJob({});
            const error = new DatabaseUnavailableException();
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

    describe('writeJobLog', () => {
        it('writes the message on the job', async () => {
            const job = buildProcessorJob({});

            await processor['writeJobLog'](job, 'a message');

            expect(job.log).toHaveBeenCalledWith('a message');
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

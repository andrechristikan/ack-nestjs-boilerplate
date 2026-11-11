import type { Queue, QueueListener } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { CacheService } from '@common/cache/services/cache.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { QueueSideEffectFailedException } from '@common/queue/exceptions/queue.side-effect-failed.exception';

describe('QueueBase', () => {
    const queue: MockProxy<Queue> = mock<Queue>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const description = 'enqueue notification after commit';
    let queueBase: QueueBase;
    let errorListener: QueueListener['error'] | null = null;

    beforeEach(() => {
        vi.resetAllMocks();
        queue.on.mockImplementation((_event, listener) => {
            errorListener = listener as QueueListener['error'];

            return queue;
        });
        queueBase = Reflect.construct(QueueBase, [
            queue,
            sentryService,
            cacheService,
        ]);
    });

    describe('constructor', () => {
        it('registers one error listener on the queue', () => {
            expect(queue.on).toHaveBeenCalledTimes(1);
            expect(queue.on).toHaveBeenCalledWith(
                'error',
                expect.any(Function)
            );
        });

        it('classifies a connection error raised on the queue and returns without throwing', () => {
            const error = new Error('connect ECONNREFUSED 127.0.0.1:6379');
            cacheService.isConnectionError.mockReturnValue(true);

            expect(() => errorListener?.(error)).not.toThrow();
            expect(cacheService.isConnectionError).toHaveBeenCalledWith(error);
        });

        it('classifies any other error raised on the queue and handles it without throwing', () => {
            const error = new Error('queue failure');
            cacheService.isConnectionError.mockReturnValue(false);

            expect(() => errorListener?.(error)).not.toThrow();
            expect(cacheService.isConnectionError).toHaveBeenCalledWith(error);
        });
    });

    describe('addSideEffect', () => {
        it('adds the job and reports nothing when add resolves', async () => {
            await expect(
                queueBase['addSideEffect'](
                    'job',
                    { id: 1 },
                    { priority: EnumQueuePriority.low, jobId: 'job-1' },
                    description
                )
            ).resolves.toBeUndefined();

            expect(queue.add).toHaveBeenCalledWith(
                'job',
                { id: 1 },
                { priority: EnumQueuePriority.low, jobId: 'job-1' }
            );
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });

        it('resolves and reports the wrapped failure when add rejects', async () => {
            const error = new Error('redis down');
            queue.add.mockRejectedValue(error);

            await expect(
                queueBase['addSideEffect'](
                    'job',
                    { id: 1 },
                    { priority: EnumQueuePriority.low, jobId: 'job-1' },
                    description
                )
            ).resolves.toBeUndefined();

            expect(sentryService.captureException).toHaveBeenCalledTimes(1);
            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    constructor: QueueSideEffectFailedException,
                    rawError: error,
                    message: description,
                })
            );
        });
    });

    describe('addBulkSideEffect', () => {
        it('adds the bulk and reports nothing when addBulk resolves', async () => {
            await expect(
                queueBase['addBulkSideEffect'](
                    [{ name: 'job', data: { id: 1 } }],
                    description
                )
            ).resolves.toBeUndefined();

            expect(queue.addBulk).toHaveBeenCalledWith([
                { name: 'job', data: { id: 1 } },
            ]);
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });

        it('resolves and reports the wrapped failure when addBulk rejects', async () => {
            const error = new Error('redis down');
            queue.addBulk.mockRejectedValue(error);

            await expect(
                queueBase['addBulkSideEffect'](
                    [{ name: 'job', data: { id: 1 } }],
                    description
                )
            ).resolves.toBeUndefined();

            expect(sentryService.captureException).toHaveBeenCalledTimes(1);
            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    constructor: QueueSideEffectFailedException,
                    rawError: error,
                    message: description,
                })
            );
        });
    });
});

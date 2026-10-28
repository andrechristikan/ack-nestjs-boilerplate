import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { SentryService } from '@common/sentry/services/sentry.service';
import { QueueBase } from '@queues/bases/queue.base';
import { EnumQueuePriority } from '@queues/enums/queue.enum';
import { QueueSideEffectFailedException } from '@queues/exceptions/queue.side-effect-failed.exception';

describe('QueueBase', () => {
    const queue: MockProxy<Queue> = mock<Queue>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const description = 'enqueue notification after commit';
    let queueBase: QueueBase;

    beforeEach(() => {
        vi.resetAllMocks();
        queueBase = Reflect.construct(QueueBase, [queue, sentryService]);
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

        it('resolves, logs at error and reports the wrapped failure when add rejects', async () => {
            const error = new Error('redis down');
            const logError = vi.spyOn(Logger.prototype, 'error');
            queue.add.mockRejectedValue(error);

            await expect(
                queueBase['addSideEffect'](
                    'job',
                    { id: 1 },
                    { priority: EnumQueuePriority.low, jobId: 'job-1' },
                    description
                )
            ).resolves.toBeUndefined();

            expect(logError).toHaveBeenCalledWith(
                expect.any(QueueSideEffectFailedException),
                description
            );
            expect(sentryService.captureException).toHaveBeenCalledTimes(1);
            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
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

        it('resolves, logs at error and reports the wrapped failure when addBulk rejects', async () => {
            const error = new Error('redis down');
            const logError = vi.spyOn(Logger.prototype, 'error');
            queue.addBulk.mockRejectedValue(error);

            await expect(
                queueBase['addBulkSideEffect'](
                    [{ name: 'job', data: { id: 1 } }],
                    description
                )
            ).resolves.toBeUndefined();

            expect(logError).toHaveBeenCalledWith(
                expect.any(QueueSideEffectFailedException),
                description
            );
            expect(sentryService.captureException).toHaveBeenCalledTimes(1);
            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    rawError: error,
                    message: description,
                })
            );
        });
    });
});

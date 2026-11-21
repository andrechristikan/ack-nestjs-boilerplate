import { Logger } from '@nestjs/common';
import type { Job, Queue, QueueListener } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { QueueBase } from '@common/queue/bases/queue.base';
import {
    EnumQueueJobState,
    EnumQueuePriority,
} from '@common/queue/enums/queue.enum';
import { buildOutboxRow } from '@test/unit/helpers/test.unit.queue.helper';

describe('QueueBase', () => {
    const queue: MockProxy<Queue> = mock<Queue>();
    let errorListener: QueueListener['error'] | null = null;
    let subject: QueueBase;

    beforeEach(() => {
        errorListener = null;
        queue.on.mockImplementation((_event, listener) => {
            errorListener = listener as QueueListener['error'];

            return queue;
        });
        subject = Reflect.construct(QueueBase, [queue]);
    });

    describe('constructor', () => {
        it('registers one error listener on the queue', () => {
            expect(queue.on).toHaveBeenCalledTimes(1);
            expect(queue.on).toHaveBeenCalledWith(
                'error',
                expect.any(Function)
            );
        });

        it('logs a warning for a connection error raised on the queue', () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('connect ECONNREFUSED 127.0.0.1:6379');

            expect(errorListener).not.toBeNull();
            expect(() => errorListener?.(error)).not.toThrow();
            expect(warn).toHaveBeenCalledWith(error, 'Queue error');
        });

        it('logs a warning for any other error raised on the queue', () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('queue failure');

            expect(errorListener).not.toBeNull();
            expect(() => errorListener?.(error)).not.toThrow();
            expect(warn).toHaveBeenCalledWith(error, 'Queue error');
        });
    });

    describe('enqueue', () => {
        it('sends one addBulk whose jobs carry each row name, outboxId, idempotency key as jobId, and priority', async () => {
            queue.addBulk.mockResolvedValue([]);

            await subject.enqueue([
                buildOutboxRow('outbox-1', EnumQueuePriority.high),
                buildOutboxRow('outbox-2', EnumQueuePriority.low),
            ]);

            expect(queue.addBulk).toHaveBeenCalledTimes(1);
            expect(queue.addBulk).toHaveBeenCalledWith([
                {
                    name: 'job-outbox-1',
                    data: { outboxId: 'outbox-1' },
                    opts: {
                        jobId: 'key-outbox-1',
                        priority: EnumQueuePriority.high,
                    },
                },
                {
                    name: 'job-outbox-2',
                    data: { outboxId: 'outbox-2' },
                    opts: {
                        jobId: 'key-outbox-2',
                        priority: EnumQueuePriority.low,
                    },
                },
            ]);
        });

        it('rejects when addBulk rejects', async () => {
            const error = new Error('Connection is closed.');
            queue.addBulk.mockRejectedValue(error);

            await expect(
                subject.enqueue([
                    buildOutboxRow('outbox-1', EnumQueuePriority.high),
                ])
            ).rejects.toBe(error);
        });
    });

    describe('getJobState', () => {
        it('returns null when the job does not exist', async () => {
            queue.getJob.mockResolvedValue(undefined);

            const result = await subject.getJobState('key-outbox-1');

            expect(result).toBeNull();
            expect(queue.getJob).toHaveBeenCalledWith('key-outbox-1');
        });

        it('returns the state, attempts, and failed reason of the job', async () => {
            const job: MockProxy<Job> = mock<Job>({
                attemptsMade: 3,
                failedReason: 'S3 delete failed',
            });
            job.getState.mockResolvedValue(EnumQueueJobState.failed);
            queue.getJob.mockResolvedValue(job);

            const result = await subject.getJobState('key-outbox-1');

            expect(result).toEqual({
                state: EnumQueueJobState.failed,
                attemptsMade: 3,
                failedReason: 'S3 delete failed',
            });
        });

        it('returns a null failed reason when the job has none', async () => {
            const job: MockProxy<Job> = mock<Job>({
                attemptsMade: 1,
                failedReason: undefined as never,
            });
            job.getState.mockResolvedValue(EnumQueueJobState.completed);
            queue.getJob.mockResolvedValue(job);

            const result = await subject.getJobState('key-outbox-1');

            expect(result).toEqual({
                state: EnumQueueJobState.completed,
                attemptsMade: 1,
                failedReason: null,
            });
        });
    });
});

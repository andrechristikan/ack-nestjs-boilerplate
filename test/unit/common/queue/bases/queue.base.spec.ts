import { Logger } from '@nestjs/common';
import type { Job, Queue, QueueListener } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { QueueBase } from '@common/queue/bases/queue.base';
import {
    EnumQueueJobState,
    EnumQueuePriority,
} from '@common/queue/enums/queue.enum';
import type { IQueueScheduler } from '@common/queue/interfaces/queue.interface';
import {
    buildHeldScheduler,
    buildOutboxRow,
    buildSchedulingQueue,
} from '@test/unit/helpers/test.unit.queue.helper';

describe('QueueBase', () => {
    const queue: MockProxy<Queue> = mock<Queue>({ name: 'test-queue' });
    const alpha: IQueueScheduler = {
        id: 'alpha',
        repeat: { pattern: '0 * * * *' },
        template: { name: 'alphaJob', data: { a: 1 }, opts: { priority: 1 } },
    };
    const beta: IQueueScheduler = {
        id: 'beta',
        repeat: { every: 1000 },
        template: { name: 'betaJob', data: {}, opts: {} },
    };
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

    describe('onModuleInit', () => {
        it('upserts each declared scheduler with its id, repeat, and template', async () => {
            queue.getJobSchedulers.mockResolvedValue([]);

            await buildSchedulingQueue(queue, [alpha, beta]).onModuleInit();

            expect(queue.upsertJobScheduler).toHaveBeenCalledTimes(2);
            expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
                'alpha',
                alpha.repeat,
                alpha.template
            );
            expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
                'beta',
                beta.repeat,
                beta.template
            );
        });

        it('removes a scheduler the queue holds whose id is not declared, and keeps a declared one', async () => {
            queue.getJobSchedulers.mockResolvedValue([
                buildHeldScheduler('alpha'),
                buildHeldScheduler('stale'),
            ]);

            await buildSchedulingQueue(queue, [alpha]).onModuleInit();

            expect(queue.removeJobScheduler).toHaveBeenCalledTimes(1);
            expect(queue.removeJobScheduler).toHaveBeenCalledWith('stale');
        });

        it('removes nothing when every held scheduler is declared', async () => {
            queue.getJobSchedulers.mockResolvedValue([
                buildHeldScheduler('alpha'),
                buildHeldScheduler('beta'),
            ]);

            await buildSchedulingQueue(queue, [alpha, beta]).onModuleInit();

            expect(queue.removeJobScheduler).not.toHaveBeenCalled();
        });

        it('upserts nothing and removes every held scheduler when none is declared', async () => {
            queue.getJobSchedulers.mockResolvedValue([
                buildHeldScheduler('alpha'),
                buildHeldScheduler('stale'),
            ]);

            await subject.onModuleInit();

            expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
            expect(queue.removeJobScheduler).toHaveBeenCalledTimes(2);
            expect(queue.removeJobScheduler).toHaveBeenCalledWith('alpha');
            expect(queue.removeJobScheduler).toHaveBeenCalledWith('stale');
        });

        it('logs one line per removed key, and none when nothing is removed', async () => {
            const log = vi.spyOn(Logger.prototype, 'log');
            queue.getJobSchedulers.mockResolvedValue([
                buildHeldScheduler('alpha'),
                buildHeldScheduler('stale'),
            ]);

            await buildSchedulingQueue(queue, [alpha]).onModuleInit();

            expect(log).toHaveBeenCalledTimes(1);
            expect(log).toHaveBeenCalledWith(
                { queue: 'test-queue', scheduler: 'stale' },
                'Stale job scheduler removed'
            );

            log.mockClear();
            queue.getJobSchedulers.mockResolvedValue([
                buildHeldScheduler('alpha'),
            ]);

            await buildSchedulingQueue(queue, [alpha]).onModuleInit();

            expect(log).not.toHaveBeenCalled();
        });

        it('rejects with the upsert error and neither reads nor removes schedulers', async () => {
            const error = new Error('Connection is closed.');
            queue.upsertJobScheduler.mockRejectedValue(error);

            await expect(
                buildSchedulingQueue(queue, [alpha]).onModuleInit()
            ).rejects.toBe(error);
            expect(queue.getJobSchedulers).not.toHaveBeenCalled();
            expect(queue.removeJobScheduler).not.toHaveBeenCalled();
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

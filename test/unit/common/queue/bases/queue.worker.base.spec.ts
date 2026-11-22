import { Worker } from 'bullmq';
import type { Processor } from 'bullmq';
import type { Redis } from 'ioredis';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { QueueWorkerBase } from '@common/queue/bases/queue.worker.base';

vi.mock('bullmq');

describe('QueueWorkerBase', () => {
    const connection: MockProxy<Redis> = mock<Redis>();
    const producerConnection: MockProxy<Redis> = mock<Redis>();
    const processor: Processor = vi.fn();

    beforeEach(() => {
        QueueWorkerBase.connection = connection;
    });

    afterEach(() => {
        QueueWorkerBase.connection = null;
    });

    describe('constructor', () => {
        it('builds the worker on the static client, replacing the given connection and keeping the other options', () => {
            Reflect.construct(QueueWorkerBase, [
                'notification',
                processor,
                {
                    concurrency: 5,
                    prefix: 'Queue',
                    connection: producerConnection,
                },
            ]);

            expect(Worker).toHaveBeenCalledWith('notification', processor, {
                concurrency: 5,
                prefix: 'Queue',
                connection,
            });
        });

        it('passes the options as given, with no concurrency of its own', () => {
            Reflect.construct(QueueWorkerBase, [
                'notification',
                processor,
                { prefix: 'Queue' },
            ]);

            expect(Worker).toHaveBeenCalledWith('notification', processor, {
                prefix: 'Queue',
                connection,
            });
        });
    });
});

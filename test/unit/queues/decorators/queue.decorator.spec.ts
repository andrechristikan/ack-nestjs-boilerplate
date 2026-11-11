import type { IQueueProcessorOptions } from '@queues/interfaces/queue.interface';

vi.mock('@nestjs/bullmq', async importOriginal => {
    const actual = await importOriginal<typeof import('@nestjs/bullmq')>();

    return { ...actual, Processor: vi.fn(actual.Processor) };
});

vi.mock('@common/redis/constants/redis.constant', () => ({
    RedisQueueWorkerClient: { connectionName: 'ack-test:processor' },
}));

describe('queue.decorator', () => {
    describe('QueueProcessor', () => {
        beforeEach(() => {
            vi.resetAllMocks();
            vi.resetModules();
        });

        it('registers the processor under the queue name with the redis worker client when no options are given', async () => {
            const { Processor } = await import('@nestjs/bullmq');
            const { RedisQueueWorkerClient } =
                await import('@common/redis/constants/redis.constant');
            const { QueueProcessor } =
                await import('@queues/decorators/queue.decorator');

            QueueProcessor('notification');

            expect(Processor).toHaveBeenCalledWith(
                { name: 'notification' },
                { connection: RedisQueueWorkerClient }
            );
        });

        it('merges the given worker options with the redis worker client', async () => {
            const { Processor } = await import('@nestjs/bullmq');
            const { RedisQueueWorkerClient } =
                await import('@common/redis/constants/redis.constant');
            const { QueueProcessor } =
                await import('@queues/decorators/queue.decorator');
            const options: IQueueProcessorOptions = { concurrency: 5 };

            QueueProcessor('workspace', options);

            expect(Processor).toHaveBeenCalledWith(
                { name: 'workspace' },
                { concurrency: 5, connection: RedisQueueWorkerClient }
            );
        });
    });
});

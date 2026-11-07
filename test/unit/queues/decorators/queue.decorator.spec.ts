import type { IQueueProcessorOptions } from '@queues/interfaces/queue.interface';

vi.mock('@nestjs/bullmq', async importOriginal => {
    const actual = await importOriginal<typeof import('@nestjs/bullmq')>();

    return { ...actual, Processor: vi.fn(actual.Processor) };
});

vi.mock('@configs/redis.config', () => ({
    default: vi.fn(() => ({
        queue: { url: 'redis://localhost:6379/1' },
    })),
}));

vi.mock('@configs/app.config', () => ({
    default: vi.fn(() => ({ name: 'ack', env: 'test' })),
}));

describe('queue.decorator', () => {
    const connection = {
        url: 'redis://localhost:6379/1',
        connectionName: 'ack-test:processor',
    };

    describe('QueueProcessor', () => {
        beforeEach(() => {
            vi.resetAllMocks();
            vi.resetModules();
        });

        it('registers the processor under the queue name with the config-built worker connection when no options are given', async () => {
            const { Processor } = await import('@nestjs/bullmq');
            const { QueueProcessor } =
                await import('@queues/decorators/queue.decorator');

            QueueProcessor('notification');

            expect(Processor).toHaveBeenCalledWith(
                { name: 'notification' },
                { connection }
            );
        });

        it('merges the given worker options with the connection', async () => {
            const { Processor } = await import('@nestjs/bullmq');
            const { QueueProcessor } =
                await import('@queues/decorators/queue.decorator');
            const options: IQueueProcessorOptions = { concurrency: 5 };

            QueueProcessor('workspace', options);

            expect(Processor).toHaveBeenCalledWith(
                { name: 'workspace' },
                { concurrency: 5, connection }
            );
        });
    });
});

import type { IQueueProcessorOptions } from '@queues/interfaces/queue.interface';

vi.mock('@nestjs/bullmq', async importOriginal => {
    const actual = await importOriginal<typeof import('@nestjs/bullmq')>();

    return { ...actual, Processor: vi.fn(actual.Processor) };
});

describe('queue.decorator', () => {
    describe('QueueProcessor', () => {
        beforeEach(() => {
            vi.resetAllMocks();
            vi.resetModules();
        });

        it('registers the processor under the queue name with empty worker options when none are given', async () => {
            const { Processor } = await import('@nestjs/bullmq');
            const { QueueProcessor } =
                await import('@queues/decorators/queue.decorator');

            QueueProcessor('notification');

            expect(Processor).toHaveBeenCalledWith(
                { name: 'notification' },
                {}
            );
        });

        it('passes the given worker options through with no connection', async () => {
            const { Processor } = await import('@nestjs/bullmq');
            const { QueueProcessor } =
                await import('@queues/decorators/queue.decorator');
            const options: IQueueProcessorOptions = { concurrency: 5 };

            QueueProcessor('workspace', options);

            expect(Processor).toHaveBeenCalledWith(
                { name: 'workspace' },
                { concurrency: 5 }
            );
        });
    });
});

import { QueueConfigKey } from '@queues/constants/queue.constant';
import { EnumQueue } from '@queues/enums/queue.enum';
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

        afterEach(() => {
            vi.unstubAllEnvs();
        });

        it('registers the processor under the queue name and the producer config key', async () => {
            const { Processor } = await import('@nestjs/bullmq');
            const { QueueProcessor } =
                await import('@queues/decorators/queue.decorator');

            QueueProcessor(EnumQueue.notification);

            expect(Processor).toHaveBeenCalledWith(
                {
                    name: EnumQueue.notification,
                    configKey: QueueConfigKey,
                },
                expect.any(Object)
            );
        });

        it('names the worker <appName>-<appEnv>:<queue>:consumer when no options are given', async () => {
            const { Processor } = await import('@nestjs/bullmq');
            const { QueueProcessor } =
                await import('@queues/decorators/queue.decorator');

            QueueProcessor(EnumQueue.notification);

            expect(Processor).toHaveBeenCalledWith(expect.any(Object), {
                name: expect.stringMatching(
                    /^[^:]+-[^:]+:notification:consumer$/
                ),
                connection: expect.any(Object),
            });
        });

        it('gives the worker its own Redis connection with the BullMQ defaults', async () => {
            vi.stubEnv('QUEUE_REDIS_URL', 'redis://localhost:6379/1');
            const { Processor } = await import('@nestjs/bullmq');
            const { QueueProcessor } =
                await import('@queues/decorators/queue.decorator');

            QueueProcessor(EnumQueue.notification);

            expect(Processor).toHaveBeenCalledWith(expect.any(Object), {
                name: expect.any(String),
                connection: {
                    url: 'redis://localhost:6379/1',
                    connectionName: expect.stringMatching(
                        /^[^:]+-[^:]+:processor$/
                    ),
                },
            });
        });

        it('passes the given worker options next to the default worker name', async () => {
            const { Processor } = await import('@nestjs/bullmq');
            const { QueueProcessor } =
                await import('@queues/decorators/queue.decorator');
            const options: IQueueProcessorOptions = { concurrency: 5 };

            QueueProcessor(EnumQueue.workspace, options);

            expect(Processor).toHaveBeenCalledWith(expect.any(Object), {
                name: expect.stringMatching(/^[^:]+-[^:]+:workspace:consumer$/),
                connection: expect.any(Object),
                concurrency: 5,
            });
        });
    });
});

import { QueueProcessorConfigKey } from '@queues/constants/queue.constant';
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

        it('registers the processor under the queue name and the processor config key', async () => {
            const { Processor } = await import('@nestjs/bullmq');
            const { QueueProcessor } =
                await import('@queues/decorators/queue.decorator');

            QueueProcessor(EnumQueue.notification);

            expect(Processor).toHaveBeenCalledWith(
                {
                    name: EnumQueue.notification,
                    configKey: QueueProcessorConfigKey,
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
                concurrency: 5,
            });
        });
    });
});

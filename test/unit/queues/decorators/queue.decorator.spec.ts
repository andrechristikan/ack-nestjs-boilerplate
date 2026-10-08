import { Processor } from '@nestjs/bullmq';
import { QueueProcessorConfigKey } from '@queues/constants/queue.constant';
import { QueueProcessor } from '@queues/decorators/queue.decorator';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueProcessorOptions } from '@queues/interfaces/queue.interface';

vi.mock('@nestjs/bullmq', async importOriginal => {
    const actual = await importOriginal<typeof import('@nestjs/bullmq')>();

    return { ...actual, Processor: vi.fn(actual.Processor) };
});

describe('queue.decorator', () => {
    describe('QueueProcessor', () => {
        beforeEach(() => {
            vi.mocked(Processor).mockClear();
        });

        it('registers the processor under the queue name and the processor config key', () => {
            QueueProcessor(EnumQueue.notification);

            expect(Processor).toHaveBeenCalledWith(
                {
                    name: EnumQueue.notification,
                    configKey: QueueProcessorConfigKey,
                },
                expect.any(Object)
            );
        });

        it('names the worker <appName>-<appEnv>:<queue>:consumer when no options are given', () => {
            QueueProcessor(EnumQueue.notification);

            expect(Processor).toHaveBeenCalledWith(expect.any(Object), {
                name: expect.stringMatching(
                    /^[^:]+-[^:]+:notification:consumer$/
                ),
            });
        });

        it('passes the given worker options next to the default worker name', () => {
            const options: IQueueProcessorOptions = { concurrency: 5 };

            QueueProcessor(EnumQueue.workspace, options);

            expect(Processor).toHaveBeenCalledWith(expect.any(Object), {
                name: expect.stringMatching(/^[^:]+-[^:]+:workspace:consumer$/),
                concurrency: 5,
            });
        });
    });
});

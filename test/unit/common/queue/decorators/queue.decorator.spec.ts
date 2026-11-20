import { Processor } from '@nestjs/bullmq';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import type { IQueueProcessorOptions } from '@common/queue/interfaces/queue.interface';

vi.mock('@nestjs/bullmq', async importOriginal => {
    const actual = await importOriginal<typeof import('@nestjs/bullmq')>();

    return { ...actual, Processor: vi.fn(actual.Processor) };
});

describe('queue.decorator', () => {
    describe('QueueProcessor', () => {
        it('registers the processor under the queue name with empty worker options when none are given', () => {
            QueueProcessor('notification');

            expect(Processor).toHaveBeenCalledWith(
                { name: 'notification' },
                {}
            );
        });

        it('passes the given worker options through with no connection', () => {
            const options: IQueueProcessorOptions = { concurrency: 5 };

            QueueProcessor('workspace', options);

            expect(Processor).toHaveBeenCalledWith(
                { name: 'workspace' },
                { concurrency: 5 }
            );
        });
    });
});

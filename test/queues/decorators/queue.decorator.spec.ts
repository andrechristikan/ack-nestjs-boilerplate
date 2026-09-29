import { QueueProcessorConfigKey } from '@queues/constants/queue.constant';
import { EnumQueue } from '@queues/enums/queue.enum';
import type { IQueueProcessorOptions } from '@queues/interfaces/queue.interface';

vi.mock('@nestjs/bullmq', async importOriginal => {
    const actual = await importOriginal<typeof import('@nestjs/bullmq')>();

    return { ...actual, Processor: vi.fn(actual.Processor) };
});

describe('QueueProcessor', () => {
    const originalAppName = process.env.APP_NAME;
    const originalAppEnv = process.env.APP_ENV;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.resetModules();
        process.env.APP_NAME = 'ack-app';
        process.env.APP_ENV = 'test';
    });

    afterEach(() => {
        if (originalAppName === undefined) {
            delete process.env.APP_NAME;
        } else {
            process.env.APP_NAME = originalAppName;
        }

        if (originalAppEnv === undefined) {
            delete process.env.APP_ENV;
        } else {
            process.env.APP_ENV = originalAppEnv;
        }
    });

    it('registers the processor with the worker consumer name built from the app env when no options are given', async () => {
        const { Processor } = await import('@nestjs/bullmq');
        const { QueueProcessor } =
            await import('@queues/decorators/queue.decorator');

        QueueProcessor(EnumQueue.notification);

        expect(Processor).toHaveBeenCalledWith(
            {
                name: EnumQueue.notification,
                configKey: QueueProcessorConfigKey,
            },
            { name: 'ack-app-test:notification:consumer' }
        );
    });

    it('merges the given worker options onto the consumer name', async () => {
        const { Processor } = await import('@nestjs/bullmq');
        const { QueueProcessor } =
            await import('@queues/decorators/queue.decorator');
        const options: IQueueProcessorOptions = { concurrency: 5 };

        QueueProcessor(EnumQueue.workspace, options);

        expect(Processor).toHaveBeenCalledWith(
            {
                name: EnumQueue.workspace,
                configKey: QueueProcessorConfigKey,
            },
            {
                name: 'ack-app-test:workspace:consumer',
                concurrency: 5,
            }
        );
    });
});

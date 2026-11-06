import type { Job } from 'bullmq';
import type { Mock } from 'vitest';
import type { MessageService } from '@common/message/services/message.service';
import type { SentryService } from '@common/sentry/services/sentry.service';
import { QueueProcessorBase } from '@queues/bases/queue.processor.base';

export function buildQueueJob<T, R, N extends string>(data: T): Job<T, R, N> {
    return {
        data,
        updateData: vi.fn().mockResolvedValue(null),
    } as unknown as Job<T, R, N>;
}

export function buildProcessorJob(overrides: Partial<Job>): Job {
    return {
        id: 'job-1',
        name: 'testJob',
        attemptsMade: 0,
        opts: { attempts: 3 },
        log: vi.fn().mockResolvedValue(1),
        ...overrides,
    } as unknown as Job;
}

export interface IQueueProcessorDoubles {
    processor: QueueProcessorBase;
    handle: Mock;
}

export function buildQueueProcessor(
    sentryService: SentryService,
    messageService: MessageService
): IQueueProcessorDoubles {
    const handle = vi.fn();
    const processor = Object.assign(
        Reflect.construct(QueueProcessorBase, [sentryService, messageService]),
        { handle }
    );

    return { processor, handle };
}

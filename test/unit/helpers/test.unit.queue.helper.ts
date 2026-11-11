import type { Job } from 'bullmq';
import type { Mock } from 'vitest';
import type { CacheService } from '@common/cache/services/cache.service';
import type { MessageService } from '@common/message/services/message.service';
import type { SentryService } from '@common/sentry/services/sentry.service';
import type { OutboxService } from '@modules/outbox/services/outbox.service';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';

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
    messageService: MessageService,
    cacheService: CacheService,
    outboxService: OutboxService
): IQueueProcessorDoubles {
    const handle = vi.fn();
    const processor = Object.assign(
        Reflect.construct(QueueProcessorBase, [
            sentryService,
            messageService,
            cacheService,
            outboxService,
        ]),
        { handle }
    );

    return { processor, handle };
}

import type { Job, JobSchedulerJson, Queue } from 'bullmq';
import { EnumOutboxStatus } from '@generated/prisma-client/client';
import type { Outbox } from '@generated/prisma-client/client';
import type { Mock } from 'vitest';
import type { CacheService } from '@common/cache/services/cache.service';
import type { MessageService } from '@common/message/services/message.service';
import type { SentryService } from '@common/sentry/services/sentry.service';
import type { OutboxService } from '@common/outbox/services/outbox.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import type { IQueueScheduler } from '@common/queue/interfaces/queue.interface';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import type { EnumQueuePriority } from '@common/queue/enums/queue.enum';

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
    const processor = Object.assign(Reflect.construct(QueueProcessorBase, []), {
        sentryService,
        messageService,
        cacheService,
        outboxService,
        handle,
    });

    return { processor, handle };
}

export function buildOutboxRow(
    id: string,
    priority: EnumQueuePriority
): Outbox {
    return {
        id,
        queue: 'test',
        name: `job-${id}`,
        data: {},
        priority,
        idempotencyKey: `key-${id}`,
        status: EnumOutboxStatus.pending,
        attempts: 0,
        lastError: null,
        enqueuedAt: null,
        sweptAt: null,
        completedAt: null,
        failedAt: null,
        createdAt: new Date('2026-11-11T09:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-11-11T09:00:00.000Z'),
        updatedBy: null,
    };
}

export function buildSchedulingQueue(
    queue: Queue,
    declared: IQueueScheduler[]
): QueueBase {
    const subject: QueueBase = Reflect.construct(QueueBase, [queue]);

    return Object.assign(subject, {
        schedulers: vi.fn().mockReturnValue(declared),
    });
}

export function buildHeldScheduler(key: string): JobSchedulerJson {
    return { key, name: `${key}Job` };
}

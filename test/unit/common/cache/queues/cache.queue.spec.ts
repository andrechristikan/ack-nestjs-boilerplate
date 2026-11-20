import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumCacheProcess,
    EnumCacheQueue,
} from '@common/cache/enums/cache.enum';
import { CacheQueue } from '@common/cache/queues/cache.queue';
import { CacheService } from '@common/cache/services/cache.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';

describe('CacheQueue', () => {
    const bullQueue: MockProxy<Queue> = mock<Queue>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    let queue: CacheQueue;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                CacheQueue,
                {
                    provide: getQueueToken(EnumCacheQueue.cache),
                    useValue: bullQueue,
                },
                { provide: CacheService, useValue: cacheService },
            ],
        }).compile();
        queue = module.get(CacheQueue);
    });

    describe('invalidateEffect', () => {
        it('returns the high-priority cache invalidate effect carrying the keys and no business key', () => {
            const effect = queue.invalidateEffect(['Entry:1', 'Lease:1']);

            expect(effect).toEqual({
                queue: EnumCacheQueue.cache,
                name: EnumCacheProcess.invalidate,
                data: { keys: ['Entry:1', 'Lease:1'] },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });
    });
});

import { CacheService } from '@common/cache/services/cache.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import {
    EnumCacheProcess,
    EnumCacheQueue,
} from '@common/cache/enums/cache.enum';
import type { ICacheInvalidateEffect } from '@common/cache/interfaces/cache.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class CacheQueue extends QueueBase {
    constructor(
        @InjectQueue(EnumCacheQueue.cache)
        protected readonly queue: Queue,
        protected readonly cacheService: CacheService
    ) {
        super(queue, cacheService);
    }

    /** The outbox effect that deletes the keys through the cache queue. */
    invalidateEffect(keys: string[]): ICacheInvalidateEffect {
        return {
            queue: EnumCacheQueue.cache,
            name: EnumCacheProcess.invalidate,
            data: { keys },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };
    }
}

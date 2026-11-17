import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type {
    EnumCacheProcess,
    EnumCacheQueue,
} from '@common/cache/enums/cache.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';

export interface ICacheLease {
    key: string;
    ttlInMs: number;
}

export interface ICacheReadThroughOptions {
    lease?: ICacheLease;
}

export interface ICacheInvalidatePayload {
    keys: string[];
}

export interface ICacheInvalidateEffect extends IOutboxEffect {
    queue: EnumCacheQueue.cache;
    name: EnumCacheProcess.invalidate;
    data: ICacheInvalidatePayload;
}

export interface ICacheQueueResponse extends IQueueResponse {
    countKeys: number;
}

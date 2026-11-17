import { Job } from 'bullmq';
import {
    EnumCacheProcess,
    EnumCacheQueue,
} from '@common/cache/enums/cache.enum';
import type {
    ICacheInvalidatePayload,
    ICacheQueueResponse,
} from '@common/cache/interfaces/cache.interface';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';

@QueueProcessor(EnumCacheQueue.cache)
export class CacheProcessor extends QueueProcessorBase {
    protected async handle(
        job: Job<unknown, IQueueResponse, EnumCacheProcess>,
        data: unknown
    ): Promise<ICacheQueueResponse> {
        switch (job.name) {
            case EnumCacheProcess.invalidate: {
                const { keys } = data as ICacheInvalidatePayload;
                await this.cacheService.invalidate(keys);
                const message = this.messageService.setMessage(
                    'cache.queue.invalidate',
                    { properties: { count: keys.length } }
                );

                return { message, countKeys: keys.length };
            }
            default:
                this.throwUnknownProcess(
                    'cache.queue.error.unknownProcess',
                    job.name
                );
        }
    }
}

import { Job } from 'bullmq';
import {
    EnumCacheProcess,
    EnumCacheQueue,
} from '@common/cache/enums/cache.enum';
import type { ICacheInvalidatePayload } from '@common/cache/interfaces/cache.interface';
import { CacheService } from '@common/cache/services/cache.service';
import { MessageService } from '@common/message/services/message.service';
import { QueueProcessorBase } from '@common/queue/bases/queue.processor.base';
import { QueueProcessor } from '@common/queue/decorators/queue.decorator';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { SentryService } from '@common/sentry/services/sentry.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';

@QueueProcessor(EnumCacheQueue.cache)
export class CacheProcessor extends QueueProcessorBase {
    constructor(
        protected readonly sentryService: SentryService,
        protected readonly messageService: MessageService,
        protected readonly cacheService: CacheService,
        protected readonly outboxService: OutboxService
    ) {
        super(sentryService, messageService, cacheService, outboxService);
    }

    protected async handle(
        job: Job<unknown, IQueueResponse, EnumCacheProcess>,
        data: unknown
    ): Promise<IQueueResponse> {
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
            default: {
                const message = this.messageService.setMessage(
                    'cache.queue.error.unknownProcess',
                    { properties: { process: job.name } }
                );

                throw new QueueException(message, true);
            }
        }
    }
}

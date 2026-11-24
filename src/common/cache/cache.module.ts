import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { EnumCacheQueue } from '@common/cache/enums/cache.enum';
import { CacheQueueFactory } from '@common/cache/factories/cache.queue.factory';
import { CacheQueue } from '@common/cache/queues/cache.queue';
import { CacheService } from '@common/cache/services/cache.service';

/** Shared module: CacheService for every service reading through Redis, the cache invalidation processor, the seed base's flush, and the kit classes sorting a Redis connection error; CacheQueue for every service adding a cache invalidation. */
@Global()
@Module({})
export class CacheModule {
    static forRoot(): DynamicModule {
        return {
            module: CacheModule,
            controllers: [],
            providers: [
                CacheService,
                CacheQueue,
                {
                    provide: EnumCacheQueue.cache,
                    useExisting: CacheQueue,
                },
            ],
            exports: [CacheService, CacheQueue],
            imports: [
                BullModule.registerQueueAsync({
                    name: EnumCacheQueue.cache,
                    useClass: CacheQueueFactory,
                }),
            ],
        };
    }
}

import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { EnumCacheQueue } from '@common/cache/enums/cache.enum';
import { CacheQueueFactory } from '@common/cache/factories/cache.queue.factory';
import { CacheService } from '@common/cache/services/cache.service';

/** Shared module: CacheService for every service and cache class reading through Redis, and for the cache invalidation processor. */
@Global()
@Module({})
export class CacheModule {
    static forRoot(): DynamicModule {
        return {
            module: CacheModule,
            controllers: [],
            providers: [CacheService],
            exports: [CacheService],
            imports: [
                BullModule.registerQueueAsync({
                    name: EnumCacheQueue.cache,
                    useClass: CacheQueueFactory,
                }),
            ],
        };
    }
}

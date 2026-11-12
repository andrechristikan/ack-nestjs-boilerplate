import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { EnumCacheQueue } from '@common/cache/enums/cache.enum';
import { CacheQueueFactory } from '@common/cache/factories/cache.queue.factory';
import { CacheService } from '@common/cache/services/cache.service';

@Module({})
export class CacheModule {
    static forRoot(): DynamicModule {
        return {
            module: CacheModule,
            global: true,
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

import {
    RedisCacheClient,
    RedisQueueClient,
    RedisQueueWorkerClient,
} from '@common/redis/constants/redis.constant';
import { RedisClientFactory } from '@common/redis/factories/redis.client.factory';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';

/** Shared module: RedisCacheClient, RedisQueueClient, and RedisQueueWorkerClient for CacheService, the queue kit, the throttle storage, the session and auth caches, and the Redis health indicator. */
@Global()
@Module({})
export class RedisModule {
    static forRoot(): DynamicModule {
        return {
            module: RedisModule,
            controllers: [],
            providers: [
                RedisClientFactory,
                {
                    provide: RedisCacheClient,
                    inject: [RedisClientFactory],
                    useFactory: (factory: RedisClientFactory) =>
                        factory.connect(factory.createCache()),
                },
                {
                    provide: RedisQueueClient,
                    inject: [RedisClientFactory],
                    useFactory: (factory: RedisClientFactory) =>
                        factory.connect(factory.createQueue()),
                },
                {
                    provide: RedisQueueWorkerClient,
                    inject: [RedisClientFactory],
                    useFactory: (factory: RedisClientFactory) =>
                        factory.connect(factory.createQueueWorker()),
                },
            ],
            exports: [
                RedisCacheClient,
                RedisQueueClient,
                RedisQueueWorkerClient,
            ],
            imports: [],
        };
    }
}

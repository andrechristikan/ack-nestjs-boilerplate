import {
    RedisCacheClient,
    RedisQueueClient,
    RedisQueueWorkerClient,
} from '@common/redis/constants/redis.constant';
import { RedisClientFactory } from '@common/redis/factories/redis.client.factory';
import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';

@Module({})
export class RedisModule {
    static forRoot(): DynamicModule {
        return {
            module: RedisModule,
            global: true,
            imports: [],
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
        };
    }
}

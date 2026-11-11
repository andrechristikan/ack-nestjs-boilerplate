import {
    RedisCacheClient,
    RedisQueueClient,
    RedisQueueWorkerClient,
    RedisQueueWorkerClientToken,
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
                    provide: RedisQueueWorkerClientToken,
                    inject: [RedisClientFactory],
                    useFactory: (factory: RedisClientFactory) =>
                        factory.connect(RedisQueueWorkerClient),
                },
            ],
            exports: [RedisCacheClient, RedisQueueClient],
        };
    }
}

import {
    RedisClientCachedProvider,
    RedisClientQueueProvider,
} from '@common/redis/constants/redis.constant';
import { createKeyv } from '@keyv/redis';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Global Redis cache module that provides Redis client for caching operations.
 * Configures Redis connection with namespace and timeout settings for cache functionality.
 */
@Global()
@Module({})
export class RedisCacheModule {
    /**
     * Creates and configures the Redis cache module with connection settings.
     * Sets up Redis client provider with namespace, timeout, and key separator configuration.
     *
     * @returns {DynamicModule} Configured dynamic module with Redis cache provider
     */
    static forRoot(): DynamicModule {
        const redisProvider = {
            provide: RedisClientCachedProvider,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return createKeyv(
                    {
                        url: configService.get<string>('redis.cache.url'),
                    },
                    {
                        connectionTimeout: 30000,
                        namespace: configService.get<string>(
                            'redis.cache.namespace'
                        ),
                        useUnlink: true,
                        keyPrefixSeparator: ':',
                    }
                );
            },
        };

        return {
            module: RedisCacheModule,
            imports: [],
            providers: [redisProvider],
            exports: [redisProvider],
        };
    }
}

/**
 * Global Redis queue module that provides Redis client for queue operations.
 * Configures Redis connection with timeout and key separator settings for queue functionality.
 */
@Global()
@Module({})
export class RedisQueueModule {
    /**
     * Creates and configures the Redis queue module with connection settings.
     * Sets up Redis client provider with timeout and key separator configuration for queue operations.
     *
     * @returns {DynamicModule} Configured dynamic module with Redis queue provider
     */
    static forRoot(): DynamicModule {
        const redisProvider = {
            provide: RedisClientQueueProvider,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return createKeyv(
                    {
                        url: configService.get<string>('redis.queue.url'),
                    },
                    {
                        connectionTimeout: 30000,
                        useUnlink: true,
                        keyPrefixSeparator: ':',
                    }
                );
            },
        };

        return {
            module: RedisQueueModule,
            imports: [],
            providers: [redisProvider],
            exports: [redisProvider],
        };
    }
}

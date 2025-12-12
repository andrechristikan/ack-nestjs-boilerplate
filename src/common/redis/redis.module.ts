import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
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
        const redisCacheProvider = {
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
            providers: [redisCacheProvider],
            exports: [redisCacheProvider],
        };
    }
}

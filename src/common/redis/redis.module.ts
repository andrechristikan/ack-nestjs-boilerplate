import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { createKeyv } from '@keyv/redis';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Global module providing the shared Keyv Redis client used as the cache backend.
 */
@Module({})
export class RedisCacheModule {
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
            global: true,
            imports: [],
            providers: [redisCacheProvider],
            exports: [redisCacheProvider],
        };
    }
}

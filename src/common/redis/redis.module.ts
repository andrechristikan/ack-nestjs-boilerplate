import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { createKeyv } from '@keyv/redis';
import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({})
export class RedisCacheModule {
    static forRoot(): DynamicModule {
        const redisCacheProvider = {
            provide: RedisClientCachedProvider,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return createKeyv(
                    {
                        url: configService.get<string>('redis.cache.url')!,
                        disableOfflineQueue: true,
                        commandOptions: {
                            timeout: configService.get<number>(
                                'redis.commandTimeoutInMs'
                            )!,
                        },
                    },
                    {
                        connectionTimeout: configService.get<number>(
                            'redis.connectTimeoutInMs'
                        )!,
                        namespace: configService.get<string>(
                            'redis.cache.namespace'
                        )!,
                        useUnlink: true,
                        keyPrefixSeparator: ':',
                        throwOnErrors: true,
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

import { DynamicModule, Module } from '@nestjs/common';
import {
    CACHE_MANAGER,
    CacheModule as CacheManagerModule,
    CacheOptions,
} from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import KeyvRedis from '@keyv/redis';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';

/**
 * Global cache module backed by Redis, exposing the cache manager app-wide with TTL from config.
 */
@Module({})
export class CacheMainModule {
    static forRoot(): DynamicModule {
        const provider = {
            provide: CacheMainProvider,
            useExisting: CACHE_MANAGER,
        };

        return {
            module: CacheMainModule,
            global: true,
            providers: [provider],
            exports: [provider],
            imports: [
                CacheManagerModule.registerAsync({
                    imports: [ConfigModule],
                    inject: [ConfigService, RedisClientCachedProvider],
                    useFactory: (
                        configService: ConfigService,
                        redisClient: KeyvRedis<unknown>
                    ): CacheOptions => {
                        return {
                            stores: [redisClient],
                            ttl: configService.get<number>(
                                'redis.cache.ttlInMs'
                            ),
                        };
                    },
                }),
            ],
        };
    }
}

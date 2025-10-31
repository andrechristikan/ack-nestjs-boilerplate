import { DynamicModule, Global, Module } from '@nestjs/common';
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
 * Global cache module that provides Redis-based caching functionality throughout the application.
 * Configures cache manager with Redis backend and manages cache providers.
 */
@Global()
@Module({})
export class CacheMainModule {
    /**
     * Creates and configures the cache module with Redis backend.
     * Sets up cache provider, imports required modules, and configures cache options.
     *
     * @returns {DynamicModule} Configured dynamic module with cache providers and imports
     */
    static forRoot(): DynamicModule {
        const provider = {
            provide: CacheMainProvider,
            useExisting: CACHE_MANAGER,
        };

        return {
            module: CacheMainModule,
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

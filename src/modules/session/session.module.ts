import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import KeyvRedis from '@keyv/redis';
import { SessionCacheProvider } from '@modules/session/constants/session.constant';
import { SessionRepositoryModule } from '@modules/session/session.repository.module';
import { SessionCacheService } from '@modules/session/services/session.cache.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionUtil } from '@modules/session/utils/session.util';
import {
    CACHE_MANAGER,
    CacheModule as CacheManagerModule,
    CacheOptions,
} from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Global so the session domain service and the login cache helpers are reachable from any
 * module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [
        SessionService,
        SessionCacheService,
        SessionUtil,
        {
            provide: SessionCacheProvider,
            useExisting: CACHE_MANAGER,
        },
    ],
    exports: [SessionService, SessionCacheService],
    imports: [
        SessionRepositoryModule,
        CacheManagerModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService, RedisClientCachedProvider],
            useFactory: (
                configService: ConfigService,
                redisClient: KeyvRedis<unknown>
            ): CacheOptions => {
                return {
                    stores: [redisClient],
                    ttl: configService.get<number>('redis.cache.ttlInMs'),
                };
            },
        }),
    ],
})
export class SessionModule {}

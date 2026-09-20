import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import KeyvRedis from '@keyv/redis';
import { SessionCacheProvider } from '@modules/session/constants/session.constant';
import { SessionRepositoryModule } from '@modules/session/session.repository.module';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionUtil } from '@modules/session/utils/session.util';
import {
    CACHE_MANAGER,
    CacheModule as CacheManagerModule,
} from '@nestjs/cache-manager';
import type { CacheOptions } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';

/**
 * Global so the session domain service and the login cache helpers are reachable from any
 * module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [
        SessionDomain,
        SessionCache,
        SessionUtil,
        {
            provide: SessionCacheProvider,
            useExisting: CACHE_MANAGER,
        },
        SessionAnalyticDomain,
    ],
    exports: [SessionDomain, SessionCache, SessionAnalyticDomain],
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
export class SessionDomainModule {}

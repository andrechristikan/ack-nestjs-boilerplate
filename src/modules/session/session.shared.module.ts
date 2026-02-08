import { Module } from '@nestjs/common';
import { SessionUtil } from '@modules/session/utils/session.util';
import {
    CACHE_MANAGER,
    CacheModule as CacheManagerModule,
    CacheOptions,
} from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { SessionCacheProvider } from '@modules/session/constants/session.constant';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';

@Module({
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
                    ttl: configService.get<number>('redis.cache.ttlInMs'),
                };
            },
        }),
    ],
    exports: [SessionRepository, SessionUtil],
    providers: [
        SessionRepository,
        SessionUtil,
        {
            provide: SessionCacheProvider,
            useExisting: CACHE_MANAGER,
        },
    ],
    controllers: [],
})
export class SessionSharedModule {}

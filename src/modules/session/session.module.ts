import { Global, Module } from '@nestjs/common';
import { SessionService } from '@modules/session/services/session.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import {
    CACHE_MANAGER,
    CacheModule as CacheManagerModule,
    CacheOptions,
} from '@nestjs/cache-manager';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';
import { SessionCacheProvider } from '@modules/session/constants/session.constant';

@Global()
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
    exports: [SessionService, SessionRepository, SessionUtil],
    providers: [
        SessionService,
        SessionRepository,
        SessionUtil,
        {
            provide: SessionCacheProvider,
            useExisting: CACHE_MANAGER,
        },
    ],
    controllers: [],
})
export class SessionModule {}

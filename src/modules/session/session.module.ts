import { Global, Module } from '@nestjs/common';
import { SessionUtil } from '@modules/session/utils/session.util';
import { SessionService } from '@modules/session/services/session.service';
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
    exports: [SessionUtil, SessionService, SessionRepository],
    providers: [
        SessionUtil,
        SessionService,
        SessionRepository,
        {
            provide: SessionCacheProvider,
            useExisting: CACHE_MANAGER,
        },
    ],
    controllers: [],
})
export class SessionModule {}

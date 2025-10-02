import { Module } from '@nestjs/common';
import { SessionUtil } from '@modules/session/utils/session.util';
import { SessionService } from '@modules/session/services/session.service';
import {
    CACHE_MANAGER,
    CacheModule,
    CacheOptions,
} from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { SESSION_CACHE_MANAGER } from '@modules/session/constants/session.constant';

@Module({
    imports: [
        CacheModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (
                configService: ConfigService
            ): Promise<CacheOptions> => ({
                max: configService.get<number>('redis.cached.max'),
                ttl: configService.get<number>('redis.cached.ttl'),
                namespace: configService.get<string>('session.namespace'),
                stores: [
                    new KeyvRedis({
                        socket: {
                            host: configService.get<string>(
                                'redis.cached.host'
                            ),
                            port: configService.get<number>(
                                'redis.cached.port'
                            ),
                        },
                        username: configService.get<string>(
                            'redis.cached.username'
                        ),
                        password: configService.get<string>(
                            'redis.cached.password'
                        ),
                        database: configService.get<number>(
                            'redis.cached.database'
                        ),
                    }),
                ],
            }),
            inject: [ConfigService],
        }),
    ],
    exports: [SessionUtil, SessionService],
    providers: [
        SessionUtil,
        SessionService,
        {
            provide: SESSION_CACHE_MANAGER,
            useExisting: CACHE_MANAGER,
        },
    ],
    controllers: [],
})
export class SessionModule {}

import { Module } from '@nestjs/common';
import { MessageModule } from '@common/message/message.module';
import { HelperModule } from '@common/helper/helper.module';
import { RequestModule } from '@common/request/request.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configs from '@config';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LoggerOptionModule } from '@common/logger/logger.option.module';
import { LoggerOptionService } from '@common/logger/services/logger.option.service';
import { PolicyModule } from '@modules/policy/policy.module';
import { FileModule } from '@common/file/file.module';
import { AuthModule } from '@modules/auth/auth.module';
import { DatabaseModule } from '@common/database/database.module';
import { PaginationModule } from '@common/pagination/pagination.module';
import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { RoleModule } from '@modules/role/role.module';
import KeyvRedis from '@keyv/redis';
import { CacheModule, CacheOptions } from '@nestjs/cache-manager';

/**
 * Common module that provides shared functionality across the application.
 * Configures global services including configuration, caching, logging, database, authentication, and pagination.
 */

@Module({
    controllers: [],
    providers: [],
    imports: [
        ConfigModule.forRoot({
            load: configs,
            isGlobal: true,
            cache: true,
            envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'local'}`],
            expandVariables: false,
        }),
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    host: configService.get<string>('redis.queue.host'),
                    port: configService.get<number>('redis.queue.port'),
                    username: configService.get<string>('redis.queue.username'),
                    password: configService.get<string>('redis.queue.password'),
                    db: configService.get<number>('redis.queue.database'),
                },
                defaultJobOptions: {
                    backoff: {
                        type: 'exponential',
                        delay: 3000,
                    },
                    attempts: 3,
                },
            }),
        }),
        PinoLoggerModule.forRootAsync({
            imports: [LoggerOptionModule],
            inject: [LoggerOptionService],
            useFactory: async (loggerOptionService: LoggerOptionService) => {
                return loggerOptionService.createOptions();
            },
        }),
        CacheModule.registerAsync({
            isGlobal: true,
            imports: [ConfigModule],
            useFactory: async (
                configService: ConfigService
            ): Promise<CacheOptions> => ({
                max: configService.get<number>('redis.cached.max'),
                ttl: configService.get<number>('redis.cached.ttl'),
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
        DatabaseModule.forRoot(),
        MessageModule.forRoot(),
        HelperModule.forRoot(),
        RequestModule.forRoot(),
        FileModule.forRoot(),
        AuthModule.forRoot(),
        PolicyModule.forRoot(),
        PaginationModule.forRoot(),
        PolicyModule.forRoot(),
        ApiKeyModule.forRoot(),
        RoleModule.forRoot(),
    ],
})
export class CommonModule {}

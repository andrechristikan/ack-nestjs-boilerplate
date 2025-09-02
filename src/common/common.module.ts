import { Module } from '@nestjs/common';
import { MessageModule } from '@common/message/message.module';
import { HelperModule } from '@common/helper/helper.module';
import { RequestModule } from '@common/request/request.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configs from '@config';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule, CacheOptions } from '@nestjs/cache-manager';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LoggerOptionModule } from '@common/logger/logger.option.module';
import { LoggerOptionService } from '@common/logger/services/logger.option.service';
import { RedisClientOptions, createKeyv } from '@keyv/redis';
import { PolicyModule } from '@modules/policy/policy.module';
import { FileModule } from '@common/file/file.module';
import { AuthModule } from '@modules/auth/auth.module';
import { DatabaseModule } from '@common/database/database.module';
import { PaginationModule } from '@common/pagination/pagination.module';

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
        CacheModule.registerAsync({
            isGlobal: true,
            imports: [ConfigModule],
            useFactory: async (
                configService: ConfigService
            ): Promise<CacheOptions> => ({
                max: configService.get<number>('redis.cached.max'),
                ttl: configService.get<number>('redis.cached.ttl'),
                stores: [
                    createKeyv({
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
                    } as RedisClientOptions).store,
                ],
            }),
            inject: [ConfigService],
        }),
        PinoLoggerModule.forRootAsync({
            imports: [LoggerOptionModule],
            inject: [LoggerOptionService],
            useFactory: async (loggerOptionService: LoggerOptionService) => {
                return loggerOptionService.createOptions();
            },
        }),
        DatabaseModule.forRoot(),
        MessageModule.forRoot(),
        HelperModule.forRoot(),
        RequestModule.forRoot(),
        FileModule.forRoot(),
        AuthModule.forRoot(),
        PolicyModule.forRoot(),
        PaginationModule.forRoot(),
    ],
})
export class CommonModule {}

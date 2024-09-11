import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseModule } from 'src/common/database/database.module';
import { DatabaseService } from 'src/common/database/services/database.service';
import { MessageModule } from 'src/common/message/message.module';
import { HelperModule } from 'src/common/helper/helper.module';
import { RequestModule } from 'src/common/request/request.module';
import { PolicyModule } from 'src/modules/policy/policy.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configs from 'src/configs';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { PaginationModule } from 'src/common/pagination/pagination.module';
import { FileModule } from 'src/common/file/file.module';
import { redisStore } from 'cache-manager-redis-store';
import { CacheModule, CacheOptions, CacheStore } from '@nestjs/cache-manager';
import type { RedisClientOptions } from 'redis';
import { BullModule } from '@nestjs/bullmq';

@Module({
    controllers: [],
    providers: [],
    imports: [
        // Config
        ConfigModule.forRoot({
            load: configs,
            isGlobal: true,
            cache: true,
            envFilePath: ['.env'],
            expandVariables: false,
        }),
        MongooseModule.forRootAsync({
            connectionName: DATABASE_CONNECTION_NAME,
            imports: [DatabaseModule],
            inject: [DatabaseService],
            useFactory: (databaseService: DatabaseService) =>
                databaseService.createOptions(),
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
                    tls: configService.get<any>('redis.queue.tls'),
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
            ): Promise<CacheOptions> => {
                const store = await redisStore({
                    socket: {
                        host: configService.get<string>('redis.cached.host'),
                        port: configService.get<number>('redis.cached.port'),
                        tls: configService.get<boolean>('redis.cached.tls'),
                    },
                    username: configService.get<string>(
                        'redis.cached.username'
                    ),
                    password: configService.get<string>(
                        'redis.cached.password'
                    ),
                });

                return {
                    store: store as any as CacheStore,
                    max: configService.get<number>('redis.cached.max'),
                    ttl: configService.get<number>('redis.cached.ttl'),
                };
            },
            inject: [ConfigService],
        }),
        MessageModule.forRoot(),
        HelperModule.forRoot(),
        RequestModule.forRoot(),
        PolicyModule.forRoot(),
        AuthModule.forRoot(),
        ApiKeyModule.forRoot(),
        PaginationModule.forRoot(),
        FileModule.forRoot(),
    ],
})
export class CommonModule {}

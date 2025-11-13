import { Module } from '@nestjs/common';
import { MessageModule } from '@common/message/message.module';
import { HelperModule } from '@common/helper/helper.module';
import { RequestModule } from '@common/request/request.module';
import configs from '@config';
import { PolicyModule } from '@modules/policy/policy.module';
import { FileModule } from '@common/file/file.module';
import { AuthModule } from '@modules/auth/auth.module';
import { DatabaseModule } from '@common/database/database.module';
import { PaginationModule } from '@common/pagination/pagination.module';
import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { RoleModule } from '@modules/role/role.module';
import { FeatureFlagModule } from '@modules/feature-flag/feature-flag.module';
import { RedisCacheModule, RedisQueueModule } from '@common/redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { CacheMainModule } from '@common/cache/cache.module';
import { LoggerModule } from '@common/logger/logger.module';
import { QueueRegisterModule } from 'src/queues/queue.register.module';
import { TermPolicyModule } from '@modules/term-policy/term-policy.module';

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
            envFilePath: ['.env', `.env.${process.env.NODE_ENV ?? 'local'}`],
            expandVariables: false,
        }),
        HelperModule.forRoot(),
        MessageModule.forRoot(),
        LoggerModule.forRoot(),
        RedisCacheModule.forRoot(),
        RedisQueueModule.forRoot(),
        QueueRegisterModule.forRoot(),
        CacheMainModule.forRoot(),
        DatabaseModule.forRoot(),
        RequestModule.forRoot(),
        FileModule.forRoot(),
        PaginationModule.forRoot(),

        ApiKeyModule.forRoot(),
        AuthModule.forRoot(),
        PolicyModule.forRoot(),
        PolicyModule.forRoot(),
        RoleModule.forRoot(),
        FeatureFlagModule.forRoot(),
        TermPolicyModule.forRoot(),
    ],
})
export class CommonModule {}

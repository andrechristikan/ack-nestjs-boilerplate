import { Module } from '@nestjs/common';
import { MessageModule } from '@common/message/message.module';
import { HelperModule } from '@common/helper/helper.module';
import { RequestModule } from '@common/request/request.module';
import { ResponseModule } from '@common/response/response.module';
import configs from '@config';
import { PolicyModule } from '@modules/policy/policy.module';
import { FileModule } from '@common/file/file.module';
import { AuthModule } from '@modules/auth/auth.module';
import { DatabaseModule } from '@common/database/database.module';
import { PaginationModule } from '@common/pagination/pagination.module';
import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { RoleModule } from '@modules/role/role.module';
import { FeatureFlagModule } from '@modules/feature-flag/feature-flag.module';
import { RedisCacheModule } from '@common/redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { CacheMainModule } from '@common/cache/cache.module';
import { LoggerModule } from '@common/logger/logger.module';
import { QueueRegisterModule } from '@queues/queue.register.module';
import { TermPolicyModule } from '@modules/term-policy/term-policy.module';
import { SessionModule } from '@modules/session/session.module';
import { FirebaseModule } from '@common/firebase/firebase.module';
import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { NotificationModule } from '@modules/notification/notification.module';

/**
 * Root shared module that composes all global infrastructure and feature modules.
 *
 * Bootstraps the following in order:
 * - Config, logger, Redis cache, BullMQ queues, cache, database, and request pipeline
 * - Shared utilities: helper, pagination, file, Firebase
 * - Feature modules: activity log, API key, auth, feature flag, role, policy, term policy, session, notification
 *
 * All sub-modules are `@Global()` or re-exported globally, making their providers available
 * application-wide without additional imports.
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
        MessageModule.forRoot(),
        LoggerModule.forRoot(),
        RedisCacheModule.forRoot(),
        QueueRegisterModule.forRoot(),
        CacheMainModule.forRoot(),
        DatabaseModule.forRoot(),
        RequestModule.forRoot(),
        ResponseModule.forRoot(),

        HelperModule.forRoot(),
        PaginationModule.forRoot(),
        FileModule.forRoot(),
        FirebaseModule.forRoot(),

        ActivityLogModule,
        ApiKeyModule,
        AuthModule,
        FeatureFlagModule,
        RoleModule,
        PolicyModule,
        TermPolicyModule,
        SessionModule,
        NotificationModule,
    ],
})
export class CommonModule {}

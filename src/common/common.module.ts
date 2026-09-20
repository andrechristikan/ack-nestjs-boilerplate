import { Module } from '@nestjs/common';
import { MessageModule } from '@common/message/message.module';
import { HelperModule } from '@common/helper/helper.module';
import { RequestModule } from '@common/request/request.module';
import { ResponseModule } from '@common/response/response.module';
import configs from '@configs/index';
import { FileModule } from '@common/file/file.module';
import { AuthDomainModule } from '@modules/auth/auth.domain.module';
import { DatabaseModule } from '@common/database/database.module';
import { PaginationModule } from '@common/pagination/pagination.module';
import { ApiKeyDomainModule } from '@modules/api-key/api-key.domain.module';
import { RedisCacheModule } from '@common/redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { CacheMainModule } from '@common/cache/cache.module';
import { LoggerModule } from '@common/logger/logger.module';
import { QueueModule } from '@queues/queue.module';
import { TermPolicyDomainModule } from '@modules/term-policy/term-policy.domain.module';
import { FirebaseModule } from '@common/firebase/firebase.module';
import { ActivityLogDomainModule } from '@modules/activity-log/activity-log.domain.module';
import { NotificationDomainModule } from '@modules/notification/notification.domain.module';
import { AppEnvSchema } from '@app/dtos/app.env.dto';
import { SessionDomainModule } from '@modules/session/session.domain.module';
import { PolicyDomainModule } from '@modules/policy/policy.domain.module';
import { RoleDomainModule } from '@modules/role/role.domain.module';
import { FeatureFlagDomainModule } from '@modules/feature-flag/feature-flag.domain.module';
import { SentryModule } from '@common/sentry/sentry.module';

/**
 * Composes kit `forRoot()` modules and the app-wide `@Global()` feature domains.
 *
 * Bootstraps the following in order:
 * - Config, message, logger, Sentry, Redis cache, BullMQ connections, cache, database, request, response
 * - Shared utilities: helper, pagination, file, Firebase
 * - Feature modules: activity log, API key, auth, feature flag, role, policy, term policy, session, notification
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
            validationSchema: AppEnvSchema,
        }),
        MessageModule.forRoot(),
        LoggerModule.forRoot(),
        SentryModule.forRoot(),
        RedisCacheModule.forRoot(),
        QueueModule.forRoot(),
        CacheMainModule.forRoot(),
        DatabaseModule.forRoot(),
        RequestModule.forRoot(),
        ResponseModule.forRoot(),

        HelperModule.forRoot(),
        PaginationModule.forRoot(),
        FileModule.forRoot(),
        FirebaseModule.forRoot(),

        ActivityLogDomainModule,
        ApiKeyDomainModule,
        AuthDomainModule,
        FeatureFlagDomainModule,
        RoleDomainModule,
        PolicyDomainModule,
        TermPolicyDomainModule,
        SessionDomainModule,
        NotificationDomainModule,
    ],
})
export class CommonModule {}

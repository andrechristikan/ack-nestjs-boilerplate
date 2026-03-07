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
import { RedisCacheModule } from '@common/redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { CacheMainModule } from '@common/cache/cache.module';
import { LoggerModule } from '@common/logger/logger.module';
import { QueueRegisterModule } from 'src/queues/queue.register.module';
import { TermPolicyModule } from '@modules/term-policy/term-policy.module';
import { SessionModule } from '@modules/session/session.module';
import { InviteModule } from '@modules/invite/invite.module';
import { TenantModule } from '@modules/tenant/tenant.module';
import { whenTenancyEnabled } from '@modules/tenant/utils/tenant.toggle';
import { FirebaseModule } from '@common/firebase/firebase.module';
import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { NotificationModule } from '@modules/notification/notification.module';

/**
 * Common module that provides shared functionality across the application.
 * All services within this module are marked as global and available across the application.
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

        HelperModule,
        PaginationModule,
        FileModule,
        FirebaseModule,

        ActivityLogModule,
        ApiKeyModule,
        AuthModule,
        FeatureFlagModule,
        RoleModule,
        PolicyModule,
        TermPolicyModule,
        SessionModule,
        NotificationModule,
        InviteModule.forRoot(),
        ...whenTenancyEnabled([TenantModule]),
    ],
})
export class CommonModule {}

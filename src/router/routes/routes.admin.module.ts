import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ActivityModule } from 'src/modules/activity/activity.module';
import { ActivityAdminController } from 'src/modules/activity/controllers/activity.admin.controller';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { ApiKeyAdminController } from 'src/modules/api-key/controllers/api-key.admin.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AuthAdminController } from 'src/modules/auth/controllers/auth.admin.controller';
import { CountryModule } from 'src/modules/country/country.module';
import { EmailModule } from 'src/modules/email/email.module';
import { PasswordHistoryAdminController } from 'src/modules/password-history/controllers/password-history.admin.controller';
import { PasswordHistoryModule } from 'src/modules/password-history/password-history.module';
import { RoleAdminController } from 'src/modules/role/controllers/role.admin.controller';
import { RoleModule } from 'src/modules/role/role.module';
import { SessionAdminController } from 'src/modules/session/controllers/session.admin.controller';
import { SessionModule } from 'src/modules/session/session.module';
import { SettingModule } from 'src/modules/setting/setting.module';
import { UserAdminController } from 'src/modules/user/controllers/user.admin.controller';
import { UserModule } from 'src/modules/user/user.module';
import { VerificationModule } from 'src/modules/verification/verification.module';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';

@Module({
    controllers: [
        ApiKeyAdminController,
        RoleAdminController,
        UserAdminController,
        AuthAdminController,
        SessionAdminController,
        PasswordHistoryAdminController,
        ActivityAdminController,
    ],
    providers: [],
    exports: [],
    imports: [
        ApiKeyModule,
        SettingModule,
        RoleModule,
        UserModule,
        AuthModule,
        EmailModule,
        CountryModule,
        SessionModule,
        PasswordHistoryModule,
        ActivityModule,
        VerificationModule,
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.EMAIL_QUEUE,
        }),
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.SMS_QUEUE,
        }),
    ],
})
export class RoutesAdminModule {}

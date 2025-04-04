import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ActivityModule } from 'src/modules/activity/activity.module';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AuthPublicController } from 'src/modules/auth/controllers/auth.public.controller';
import { CountryModule } from 'src/modules/country/country.module';
import { EmailModule } from 'src/modules/email/email.module';
import { HelloPublicController } from 'src/modules/hello/controllers/hello.public.controller';
import { PasswordHistoryModule } from 'src/modules/password-history/password-history.module';
import { ResetPasswordPublicController } from 'src/modules/reset-password/controllers/reset-password.public.controller';
import { ResetPasswordModule } from 'src/modules/reset-password/reset-password.module';
import { RoleModule } from 'src/modules/role/role.module';
import { SessionModule } from 'src/modules/session/session.module';
import { SettingModule } from 'src/modules/setting/setting.module';
import { UserModule } from 'src/modules/user/user.module';
import { VerificationModule } from 'src/modules/verification/verification.module';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';

@Module({
    controllers: [
        HelloPublicController,
        AuthPublicController,
        ResetPasswordPublicController,
    ],
    providers: [],
    exports: [],
    imports: [
        SettingModule,
        UserModule,
        AuthModule,
        RoleModule,
        EmailModule,
        CountryModule,
        PasswordHistoryModule,
        SessionModule,
        ActivityModule,
        ResetPasswordModule,
        VerificationModule,
        ApiKeyModule,
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.EMAIL_QUEUE,
        }),
    ],
})
export class RoutesPublicModule {}

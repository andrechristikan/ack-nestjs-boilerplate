import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ActivityModule } from '@module/activity/activity.module';
import { ApiKeyModule } from '@module/api-key/api-key.module';
import { AuthModule } from '@module/auth/auth.module';
import { AuthPublicController } from '@module/auth/controllers/auth.public.controller';
import { CountryModule } from '@module/country/country.module';
import { EmailModule } from '@module/email/email.module';
import { HelloPublicController } from '@module/hello/controllers/hello.public.controller';
import { PasswordHistoryModule } from '@module/password-history/password-history.module';
import { ResetPasswordPublicController } from '@module/reset-password/controllers/reset-password.public.controller';
import { ResetPasswordModule } from '@module/reset-password/reset-password.module';
import { RoleModule } from '@module/role/role.module';
import { SessionModule } from '@module/session/session.module';
import { SettingModule } from '@module/setting/setting.module';
import { UserModule } from '@module/user/user.module';
import { VerificationModule } from '@module/verification/verification.module';
import { ENUM_WORKER_QUEUES } from '@worker/enums/worker.enum';

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

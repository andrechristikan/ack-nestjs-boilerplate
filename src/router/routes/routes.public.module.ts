import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ActivityModule } from '@modules/activity/activity.module';
import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { AuthModule } from '@modules/auth/auth.module';
import { AuthPublicController } from '@modules/auth/controllers/auth.public.controller';
import { CountryModule } from '@modules/country/country.module';
import { EmailModule } from '@modules/email/email.module';
import { HelloPublicController } from '@modules/hello/controllers/hello.public.controller';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { ResetPasswordPublicController } from '@modules/reset-password/controllers/reset-password.public.controller';
import { ResetPasswordModule } from '@modules/reset-password/reset-password.module';
import { RoleModule } from '@modules/role/role.module';
import { SessionModule } from '@modules/session/session.module';
import { SettingModule } from '@modules/setting/setting.module';
import { UserModule } from '@modules/user/user.module';
import { VerificationModule } from '@modules/verification/verification.module';
import { ENUM_WORKER_QUEUES } from '@workers/enums/worker.enum';

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

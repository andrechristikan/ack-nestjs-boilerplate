import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ActivityModule } from '@module/activity/activity.module';
import { ActivitySharedController } from '@module/activity/controllers/activity.shared.controller';
import { ApiKeyModule } from '@module/api-key/api-key.module';
import { AuthModule } from '@module/auth/auth.module';
import { AuthSharedController } from '@module/auth/controllers/auth.shared.controller';
import { AwsModule } from '@module/aws/aws.module';
import { CountryModule } from '@module/country/country.module';
import { EmailModule } from '@module/email/email.module';
import { PasswordHistorySharedController } from '@module/password-history/controllers/password-history.shared.controller';
import { PasswordHistoryModule } from '@module/password-history/password-history.module';
import { SessionSharedController } from '@module/session/controllers/session.shared.controller';
import { SessionModule } from '@module/session/session.module';
import { UserSharedController } from '@module/user/controllers/user.shared.controller';
import { UserModule } from '@module/user/user.module';
import { ENUM_WORKER_QUEUES } from '@worker/enums/worker.enum';

@Module({
    controllers: [
        UserSharedController,
        AuthSharedController,
        SessionSharedController,
        PasswordHistorySharedController,
        ActivitySharedController,
    ],
    providers: [],
    exports: [],
    imports: [
        UserModule,
        EmailModule,
        AuthModule,
        AwsModule,
        CountryModule,
        SessionModule,
        PasswordHistoryModule,
        ActivityModule,
        ApiKeyModule,
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.EMAIL_QUEUE,
        }),
    ],
})
export class RoutesSharedModule {}

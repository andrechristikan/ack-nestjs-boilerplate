import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ActivityModule } from '@modules/activity/activity.module';
import { ActivitySharedController } from '@modules/activity/controllers/activity.shared.controller';
import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { AuthModule } from '@modules/auth/auth.module';
import { AuthSharedController } from '@modules/auth/controllers/auth.shared.controller';
import { AwsModule } from '@modules/aws/aws.module';
import { CountryModule } from '@modules/country/country.module';
import { EmailModule } from '@modules/email/email.module';
import { PasswordHistorySharedController } from '@modules/password-history/controllers/password-history.shared.controller';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { SessionSharedController } from '@modules/session/controllers/session.shared.controller';
import { SessionModule } from '@modules/session/session.module';
import { UserSharedController } from '@modules/user/controllers/user.shared.controller';
import { UserModule } from '@modules/user/user.module';
import { ENUM_WORKER_QUEUES } from '@workers/enums/worker.enum';

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

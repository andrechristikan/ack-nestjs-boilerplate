import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ActivityModule } from '@modules/activity/activity.module';
import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { AuthModule } from '@modules/auth/auth.module';
import { CountryModule } from '@modules/country/country.module';
import { SessionModule } from '@modules/session/session.module';
import { UserUserController } from '@modules/user/controllers/user.user.controller';
import { UserModule } from '@modules/user/user.module';
import { VerificationUserController } from '@modules/verification/controllers/verification.user.controller';
import { VerificationModule } from '@modules/verification/verification.module';
import { ENUM_WORKER_QUEUES } from '@workers/enums/worker.enum';
import { TermsPolicyModule } from '@modules/terms-policy/terms-policy.module';
import { TermsPolicyUserController } from '@modules/terms-policy/controllers/terms-policy.user.controller';

@Module({
    controllers: [
        UserUserController,
        VerificationUserController,
        TermsPolicyUserController,
    ],
    providers: [],
    exports: [],
    imports: [
        UserModule,
        AuthModule,
        ActivityModule,
        SessionModule,
        CountryModule,
        ApiKeyModule,
        VerificationModule,
        TermsPolicyModule,
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.EMAIL_QUEUE,
        }),
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.SMS_QUEUE,
        }),
    ],
})
export class RoutesUserModule {}

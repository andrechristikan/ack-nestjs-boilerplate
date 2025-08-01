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
import { TermPolicyModule } from '@modules/term-policy/term-policy.module';
import { TermPolicyUserController } from '@modules/term-policy/controllers/term-policy.user.controller';

@Module({
    controllers: [
        UserUserController,
        VerificationUserController,
        TermPolicyUserController,
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
        TermPolicyModule,
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.EMAIL_QUEUE,
        }),
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.SMS_QUEUE,
        }),
    ],
})
export class RoutesUserModule {}

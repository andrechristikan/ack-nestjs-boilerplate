import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ActivityModule } from '@module/activity/activity.module';
import { ApiKeyModule } from '@module/api-key/api-key.module';
import { AuthModule } from '@module/auth/auth.module';
import { CountryModule } from '@module/country/country.module';
import { SessionModule } from '@module/session/session.module';
import { UserUserController } from '@module/user/controllers/user.user.controller';
import { UserModule } from '@module/user/user.module';
import { VerificationUserController } from '@module/verification/controllers/verification.user.controller';
import { VerificationModule } from '@module/verification/verification.module';
import { ENUM_WORKER_QUEUES } from '@worker/enums/worker.enum';

@Module({
    controllers: [UserUserController, VerificationUserController],
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
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.EMAIL_QUEUE,
        }),
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.SMS_QUEUE,
        }),
    ],
})
export class RoutesUserModule {}

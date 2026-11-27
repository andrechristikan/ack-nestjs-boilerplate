import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { EnumMfaQueue } from '@modules/mfa/enums/mfa.enum';
import { MfaQueueFactory } from '@modules/mfa/factories/mfa.queue.factory';
import { MfaQueue } from '@modules/mfa/queues/mfa.queue';
import { MfaChallengeRepository } from '@modules/mfa/repositories/mfa.challenge.repository';
import { MfaPasskeyRepository } from '@modules/mfa/repositories/mfa.passkey.repository';
import { MfaRepository } from '@modules/mfa/repositories/mfa.repository';
import { MfaTotpRepository } from '@modules/mfa/repositories/mfa.totp.repository';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import { NotificationModule } from '@modules/notification/notification.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        MfaRepository,
        MfaTotpRepository,
        MfaChallengeRepository,
        MfaPasskeyRepository,
        MfaService,
        MfaTotpService,
        MfaPasskeyService,
        MfaChallengeService,
        MfaQueue,
        {
            provide: EnumMfaQueue.mfa,
            useExisting: MfaQueue,
        },
    ],
    exports: [
        MfaService,
        MfaTotpService,
        MfaPasskeyService,
        MfaChallengeService,
        MfaQueue,
    ],
    imports: [
        ActivityLogModule,
        NotificationModule,
        BullModule.registerQueueAsync({
            name: EnumMfaQueue.mfa,
            useClass: MfaQueueFactory,
        }),
    ],
})
export class MfaModule {}

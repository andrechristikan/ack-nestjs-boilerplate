import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { MfaAnalyticRepository } from '@modules/mfa/repositories/mfa.analytic.repository';
import { MfaChallengeRepository } from '@modules/mfa/repositories/mfa.challenge.repository';
import { MfaPasskeyRepository } from '@modules/mfa/repositories/mfa.passkey.repository';
import { MfaRepository } from '@modules/mfa/repositories/mfa.repository';
import { MfaTotpRepository } from '@modules/mfa/repositories/mfa.totp.repository';
import { MfaAnalyticService } from '@modules/mfa/services/mfa.analytic.service';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import { MfaUtil } from '@modules/mfa/utils/mfa.util';
import { NotificationModule } from '@modules/notification/notification.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        MfaRepository,
        MfaTotpRepository,
        MfaChallengeRepository,
        MfaPasskeyRepository,
        MfaAnalyticRepository,
        MfaService,
        MfaTotpService,
        MfaPasskeyService,
        MfaChallengeService,
        MfaAnalyticService,
        MfaUtil,
    ],
    exports: [
        MfaService,
        MfaTotpService,
        MfaPasskeyService,
        MfaChallengeService,
        MfaAnalyticService,
        MfaUtil,
    ],
    imports: [ActivityLogModule, NotificationModule],
})
export class MfaModule {}

import { MessageService } from '@common/message/services/message.service';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type { IUserPurgeExpiredQueueResponse } from '@modules/user/interfaces/user.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserProcessPurgeExpiredUseCase implements IAppUseCase<
    [],
    IUserPurgeExpiredQueueResponse
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly mfaChallengeService: MfaChallengeService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly userVerificationService: UserVerificationService,
        private readonly userPasswordService: UserPasswordService,
        private readonly messageService: MessageService
    ) {}

    async execute(): Promise<IUserPurgeExpiredQueueResponse> {
        const [
            sessions,
            mfaChallenges,
            passwordHistories,
            verifications,
            forgotPasswords,
        ] = await Promise.all([
            this.sessionService.purgeExpired(),
            this.mfaChallengeService.purgeExpired(),
            this.passwordHistoryService.purgeExpired(),
            this.userVerificationService.purgeExpired(),
            this.userPasswordService.purgeExpired(),
        ]);

        const message = this.messageService.setMessage(
            'user.queue.purgeExpired'
        );

        return {
            message,
            sessions,
            mfaChallenges,
            passwordHistories,
            verifications,
            forgotPasswords,
        };
    }
}

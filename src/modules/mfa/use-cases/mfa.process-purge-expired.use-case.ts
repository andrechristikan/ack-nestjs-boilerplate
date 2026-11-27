import { MessageService } from '@common/message/services/message.service';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { Injectable } from '@nestjs/common';
import type { IMfaPurgeExpiredQueueResponse } from '@modules/mfa/interfaces/mfa.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class MfaProcessPurgeExpiredUseCase implements IAppUseCase<
    [],
    IMfaPurgeExpiredQueueResponse
> {
    constructor(
        private readonly mfaChallengeService: MfaChallengeService,
        private readonly messageService: MessageService
    ) {}

    async execute(): Promise<IMfaPurgeExpiredQueueResponse> {
        const mfaChallenges = await this.mfaChallengeService.purgeExpired();

        const message = this.messageService.setMessage(
            'mfa.queue.purgeExpired'
        );

        return { message, mfaChallenges };
    }
}

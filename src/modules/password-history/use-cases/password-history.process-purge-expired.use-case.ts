import { MessageService } from '@common/message/services/message.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { Injectable } from '@nestjs/common';
import type { IPasswordHistoryPurgeExpiredQueueResponse } from '@modules/password-history/interfaces/password-history.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class PasswordHistoryProcessPurgeExpiredUseCase implements IAppUseCase<
    [],
    IPasswordHistoryPurgeExpiredQueueResponse
> {
    constructor(
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly messageService: MessageService
    ) {}

    async execute(): Promise<IPasswordHistoryPurgeExpiredQueueResponse> {
        const passwordHistories =
            await this.passwordHistoryService.purgeExpired();

        const message = this.messageService.setMessage(
            'passwordHistory.queue.purgeExpired'
        );

        return { message, passwordHistories };
    }
}

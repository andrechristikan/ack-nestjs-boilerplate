import { MessageService } from '@common/message/services/message.service';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';
import type { ISessionPurgeExpiredQueueResponse } from '@modules/session/interfaces/session.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class SessionProcessPurgeExpiredUseCase implements IAppUseCase<
    [],
    ISessionPurgeExpiredQueueResponse
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly messageService: MessageService
    ) {}

    async execute(): Promise<ISessionPurgeExpiredQueueResponse> {
        const sessions = await this.sessionService.purgeExpired();

        const message = this.messageService.setMessage(
            'session.queue.purgeExpired'
        );

        return { message, sessions };
    }
}

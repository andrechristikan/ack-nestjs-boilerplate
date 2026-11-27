import { MessageService } from '@common/message/services/message.service';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';
import type {
    ISessionPurgeLoginsPayload,
    ISessionPurgeLoginsQueueResponse,
} from '@modules/session/interfaces/session.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class SessionProcessPurgeLoginsUseCase implements IAppUseCase<
    [ISessionPurgeLoginsPayload],
    ISessionPurgeLoginsQueueResponse
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        data: ISessionPurgeLoginsPayload
    ): Promise<ISessionPurgeLoginsQueueResponse> {
        const { userId, sessions } = data;
        await this.sessionService.deleteLogins(userId, sessions);

        const message = this.messageService.setMessage(
            'session.queue.purgeLogins'
        );

        return {
            message,
            countSessions: sessions.length,
        };
    }
}

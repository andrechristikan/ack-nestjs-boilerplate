import { MessageService } from '@common/message/services/message.service';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';
import type {
    IUserPurgeLoginsPayload,
    IUserPurgeLoginsQueueResponse,
} from '@modules/user/interfaces/user.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserProcessPurgeLoginsUseCase implements IAppUseCase<
    [IUserPurgeLoginsPayload],
    IUserPurgeLoginsQueueResponse
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        data: IUserPurgeLoginsPayload
    ): Promise<IUserPurgeLoginsQueueResponse> {
        const { userId, sessions } = data;
        await this.sessionService.deleteLogins(userId, sessions);

        const message = this.messageService.setMessage(
            'user.queue.auth.purgeLogins'
        );

        return {
            message,
            countSessions: sessions.length,
        };
    }
}

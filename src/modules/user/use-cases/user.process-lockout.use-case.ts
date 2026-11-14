import { OutboxService } from '@common/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { MessageService } from '@common/message/services/message.service';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserProcessLockoutUseCase implements IAppUseCase<
    [string],
    IQueueResponse
> {
    constructor(
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    async execute(userId: string): Promise<IQueueResponse> {
        const now = this.helperDateService.create();
        const revoked = await this.outboxService.withTransaction(async tx => {
            const isDeactivated =
                await this.userService.deactivateForMaxAttemptInTx(tx, userId);
            if (!isDeactivated) {
                return [];
            }

            const sessions = await this.sessionService.revokeAllByUserInTx(
                tx,
                userId,
                userId,
                now
            );

            return sessions;
        });

        const message = this.messageService.setMessage('user.queue.lockout');

        return {
            message,
            countSessions: revoked.length,
        };
    }
}

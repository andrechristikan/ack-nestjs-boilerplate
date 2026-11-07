import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DeviceService } from '@modules/device/services/device.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
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
        private readonly deviceService: DeviceService,
        private readonly sessionQueue: SessionQueue,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    async execute(userId: string): Promise<IQueueResponse> {
        const now = this.helperDateService.create();
        const revoked = await this.databaseService.withTransaction(async tx => {
            const isDeactivated =
                await this.userService.deactivateForMaxAttemptInTx(tx, userId);
            if (!isDeactivated) {
                return [];
            }

            const sessions = await this.sessionService.revokeActiveByUserInTx(
                tx,
                userId,
                userId,
                now
            );
            await this.deviceService.revokeAllByUserInTx(
                tx,
                userId,
                userId,
                now
            );

            return sessions;
        });
        await this.sessionQueue.purgeLogins(userId, revoked);

        const message = this.messageService.setMessage('user.queue.lockout');

        return {
            message,
            countSessions: revoked.length,
        };
    }
}

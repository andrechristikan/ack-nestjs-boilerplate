import { DeviceService } from '@modules/device/services/device.service';
import { SessionService } from '@modules/session/services/session.service';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class SessionProcessPurgeLoginsUseCase implements IAppUseCase<
    [ISessionPurgeLoginsPayload],
    IQueueResponse
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly deviceService: DeviceService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    async execute(data: ISessionPurgeLoginsPayload): Promise<IQueueResponse> {
        const { userId, sessions } = data;
        const now = this.helperDateService.create();
        await Promise.all([
            this.sessionService.deleteLogins(userId, sessions),
            this.deviceService.clearNotificationsWithoutLiveSession(
                userId,
                now
            ),
        ]);

        const message = this.messageService.setMessage(
            'session.queue.purgeLogins'
        );

        return {
            message,
            countSessions: sessions.length,
        };
    }
}

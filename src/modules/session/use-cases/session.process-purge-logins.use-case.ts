import { DeviceService } from '@modules/device/services/device.service';
import { SessionService } from '@modules/session/services/session.service';
import { EnumSessionProcess } from '@modules/session/enums/session.enum';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { Job } from 'bullmq';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class SessionProcessPurgeLoginsUseCase implements IAppUseCase<
    [Job<ISessionPurgeLoginsPayload, unknown, EnumSessionProcess>],
    IQueueResponse
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly deviceService: DeviceService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        job: Job<ISessionPurgeLoginsPayload, unknown, EnumSessionProcess>
    ): Promise<IQueueResponse> {
        const { userId, sessions } = job.data;
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

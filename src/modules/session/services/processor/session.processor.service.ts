import { DeviceDomain } from '@modules/device/domains/device.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { EnumSessionProcess } from '@modules/session/enums/session.enum';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { Job } from 'bullmq';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@queues/exceptions/queue.exception';

@Injectable()
export class SessionProcessorService {
    constructor(
        private readonly sessionDomain: SessionDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    async processPurgeLogins(
        job: Job<ISessionPurgeLoginsPayload, unknown, EnumSessionProcess>
    ): Promise<IQueueResponse> {
        const { userId, sessions } = job.data;
        const now = this.helperDateService.create();
        await Promise.all([
            this.sessionDomain.deleteLogins(userId, sessions),
            this.deviceDomain.clearNotificationsWithoutLiveSession(userId, now),
        ]);

        const message = this.messageService.setMessage(
            'session.queue.purgeLogins'
        );

        return {
            message,
            countSessions: sessions.length,
        };
    }
    processUnknown(process: string): never {
        const message = this.messageService.setMessage(
            'session.queue.error.unknownProcess',
            { properties: { process } }
        );

        throw new QueueException(message, true);
    }
}

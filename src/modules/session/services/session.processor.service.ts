import { SessionDomain } from '@modules/session/domains/session.domain';
import { EnumSessionProcess } from '@modules/session/enums/session.enum';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { Job } from 'bullmq';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@queues/exceptions/queue.exception';

@Injectable()
export class SessionProcessorService {
    constructor(
        private readonly sessionDomain: SessionDomain,
        private readonly messageService: MessageService
    ) {}

    async processPurgeLogins(
        job: Job<ISessionPurgeLoginsPayload, unknown, EnumSessionProcess>
    ): Promise<IQueueResponse> {
        const { userId, sessions } = job.data;
        await this.sessionDomain.deleteLogins(userId, sessions);

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

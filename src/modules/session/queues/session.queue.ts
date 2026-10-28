import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { EnumSessionProcess } from '@modules/session/enums/session.enum';
import type {
    ISessionPurgeLoginsPayload,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@queues/bases/queue.base';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { MessageService } from '@common/message/services/message.service';

/**
 * Enqueues the session cache purge that follows a committed revoke, each job under a fresh job id.
 */
@Injectable()
export class SessionQueue extends QueueBase {
    private readonly purgeLoginsJobIdPattern: string;

    constructor(
        @InjectQueue(EnumQueue.session) protected readonly queue: Queue,
        protected readonly sentryService: SentryService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly messageService: MessageService
    ) {
        super(queue, sentryService);
        this.purgeLoginsJobIdPattern = this.configService.get<string>(
            'session.jobId.purgeLoginsPattern'
        )!;
    }

    async purgeLogins(userId: string, sessions: ISessionRef[]): Promise<void> {
        if (sessions.length === 0) {
            return;
        }

        const nonce = this.databaseUtil.createId();
        const jobId = this.helperStringService.fillPattern(
            this.purgeLoginsJobIdPattern,
            { process: EnumSessionProcess.purgeLogins, nonce }
        );
        const data: ISessionPurgeLoginsPayload = { userId, sessions };

        const description = this.messageService.setMessage(
            'session.queue.error.enqueuePurgeLogins'
        );

        await this.addSideEffect(
            EnumSessionProcess.purgeLogins,
            data,
            {
                priority: EnumQueuePriority.high,
                jobId,
            },
            description
        );
    }
}

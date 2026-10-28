import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import type { ITermPolicyDeleteContentPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@queues/bases/queue.base';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { MessageService } from '@common/message/services/message.service';

/**
 * Enqueues the S3 content delete that follows a committed draft delete, each job under a fresh job id.
 */
@Injectable()
export class TermPolicyQueue extends QueueBase {
    private readonly deleteContentJobIdPattern: string;

    constructor(
        @InjectQueue(EnumQueue.termPolicy) protected readonly queue: Queue,
        protected readonly sentryService: SentryService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly messageService: MessageService
    ) {
        super(queue, sentryService);
        this.deleteContentJobIdPattern = this.configService.get<string>(
            'termPolicy.jobId.deleteContentPattern'
        )!;
    }

    async deleteContent(path: string): Promise<void> {
        const nonce = this.databaseUtil.createId();
        const jobId = this.helperStringService.fillPattern(
            this.deleteContentJobIdPattern,
            { process: EnumTermPolicyProcess.deleteContent, nonce }
        );
        const data: ITermPolicyDeleteContentPayload = { path };

        const description = this.messageService.setMessage(
            'termPolicy.queue.error.enqueueDeleteContent'
        );

        await this.addSideEffect(
            EnumTermPolicyProcess.deleteContent,
            data,
            {
                priority: EnumQueuePriority.low,
                jobId,
            },
            description
        );
    }
}

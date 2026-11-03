import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import type {
    ITermPolicyCopyContentPayload,
    ITermPolicyDeleteContentPayload,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@queues/bases/queue.base';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { MessageService } from '@common/message/services/message.service';

/**
 * Enqueues the S3 content delete that follows a committed draft delete and the S3 content copy that follows a committed publish.
 */
@Injectable()
export class TermPolicyQueue extends QueueBase {
    private readonly deleteContentJobIdPattern: string;
    private readonly copyContentJobIdPattern: string;

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
        this.copyContentJobIdPattern = this.configService.get<string>(
            'termPolicy.jobId.copyContentPattern'
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

    async copyContent(payload: ITermPolicyCopyContentPayload): Promise<void> {
        const jobId = this.helperStringService.fillPattern(
            this.copyContentJobIdPattern,
            {
                process: EnumTermPolicyProcess.copyContent,
                termPolicyId: payload.termPolicyId,
            }
        );

        const description = this.messageService.setMessage(
            'termPolicy.queue.error.enqueueCopyContent'
        );

        await this.addSideEffect(
            EnumTermPolicyProcess.copyContent,
            payload,
            {
                priority: EnumQueuePriority.high,
                jobId,
            },
            description
        );
    }
}

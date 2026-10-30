import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import type { ITermPolicyDeleteContentPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { Job } from 'bullmq';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@queues/exceptions/queue.exception';

@Injectable()
export class TermPolicyProcessorService {
    constructor(
        private readonly termPolicyDomain: TermPolicyDomain,
        private readonly messageService: MessageService
    ) {}

    async processDeleteContent(
        job: Job<
            ITermPolicyDeleteContentPayload,
            unknown,
            EnumTermPolicyProcess
        >
    ): Promise<IQueueResponse> {
        const { path } = job.data;
        await this.termPolicyDomain.deleteContentDir(path);

        const message = this.messageService.setMessage(
            'termPolicy.queue.deleteContent'
        );

        return {
            message,
            path,
        };
    }
    processUnknown(process: string): never {
        const message = this.messageService.setMessage(
            'termPolicy.queue.error.unknownProcess',
            { properties: { process } }
        );

        throw new QueueException(message, true);
    }
}

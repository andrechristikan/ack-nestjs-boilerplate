import { MessageService } from '@common/message/services/message.service';
import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import type { ITermPolicyCopyContentPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { Job } from 'bullmq';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyProcessCopyContentUseCase implements IAppUseCase<
    [Job<ITermPolicyCopyContentPayload, unknown, EnumTermPolicyProcess>],
    IQueueResponse
> {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        job: Job<ITermPolicyCopyContentPayload, unknown, EnumTermPolicyProcess>
    ): Promise<IQueueResponse> {
        const { termPolicyId, destination } = job.data;
        await this.termPolicyService.copyContent(job.data);

        const message = this.messageService.setMessage(
            'termPolicy.queue.copyContent',
            { properties: { termPolicyId } }
        );

        return {
            message,
            destination,
        };
    }
}

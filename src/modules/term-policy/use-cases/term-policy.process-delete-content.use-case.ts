import { MessageService } from '@common/message/services/message.service';
import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import type { ITermPolicyDeleteContentPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { Job } from 'bullmq';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyProcessDeleteContentUseCase implements IAppUseCase<
    [Job<ITermPolicyDeleteContentPayload, unknown, EnumTermPolicyProcess>],
    IQueueResponse
> {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        job: Job<
            ITermPolicyDeleteContentPayload,
            unknown,
            EnumTermPolicyProcess
        >
    ): Promise<IQueueResponse> {
        const { path } = job.data;
        await this.termPolicyService.deleteContentDir(path);

        const message = this.messageService.setMessage(
            'termPolicy.queue.deleteContent'
        );

        return {
            message,
            path,
        };
    }
}

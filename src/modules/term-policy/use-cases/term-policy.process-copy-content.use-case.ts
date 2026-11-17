import { MessageService } from '@common/message/services/message.service';
import type { ITermPolicyCopyContentPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { Injectable } from '@nestjs/common';
import type { ITermPolicyCopyContentQueueResponse } from '@modules/term-policy/interfaces/term-policy.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyProcessCopyContentUseCase implements IAppUseCase<
    [ITermPolicyCopyContentPayload],
    ITermPolicyCopyContentQueueResponse
> {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        data: ITermPolicyCopyContentPayload
    ): Promise<ITermPolicyCopyContentQueueResponse> {
        const { termPolicyId, destination } = data;
        await this.termPolicyService.copyContent(data);

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

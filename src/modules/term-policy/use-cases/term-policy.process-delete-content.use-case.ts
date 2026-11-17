import { MessageService } from '@common/message/services/message.service';
import type { ITermPolicyDeleteContentPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { Injectable } from '@nestjs/common';
import type { ITermPolicyDeleteContentQueueResponse } from '@modules/term-policy/interfaces/term-policy.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyProcessDeleteContentUseCase implements IAppUseCase<
    [ITermPolicyDeleteContentPayload],
    ITermPolicyDeleteContentQueueResponse
> {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        data: ITermPolicyDeleteContentPayload
    ): Promise<ITermPolicyDeleteContentQueueResponse> {
        const { path } = data;
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

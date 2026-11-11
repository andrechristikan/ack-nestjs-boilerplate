import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { MessageService } from '@common/message/services/message.service';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';

@Injectable()
export class OutboxProcessSweepUseCase implements IAppUseCase<
    [],
    IQueueResponse
> {
    constructor(
        private readonly outboxService: OutboxService,
        private readonly messageService: MessageService
    ) {}

    async execute(): Promise<IQueueResponse> {
        const count = await this.outboxService.sweep();

        const message = this.messageService.setMessage('outbox.queue.sweep', {
            properties: { count },
        });

        return { message, count };
    }
}

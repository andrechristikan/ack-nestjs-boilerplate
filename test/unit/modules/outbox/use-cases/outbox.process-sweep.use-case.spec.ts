import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MessageService } from '@common/message/services/message.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { OutboxProcessSweepUseCase } from '@modules/outbox/use-cases/outbox.process-sweep.use-case';

describe('OutboxProcessSweepUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: OutboxProcessSweepUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OutboxProcessSweepUseCase,
                { provide: MessageService, useValue: messageService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();

        useCase = module.get(OutboxProcessSweepUseCase);
    });

    describe('execute', () => {
        it('sweeps the pending rows and reports the swept count', async () => {
            outboxService.sweep.mockResolvedValue(3);

            const result = await useCase.execute();

            expect(result).toEqual({ message: 'outbox.queue.sweep', count: 3 });
            expect(outboxService.sweep).toHaveBeenCalledWith();
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'outbox.queue.sweep',
                { properties: { count: 3 } }
            );
        });
    });
});

import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import type { ITermPolicyCopyContentPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyProcessCopyContentUseCase } from '@modules/term-policy/use-cases/term-policy.process-copy-content.use-case';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { QueueException } from '@queues/exceptions/queue.exception';
import { MessageService } from '@common/message/services/message.service';

describe('TermPolicyProcessCopyContentUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();

    let useCase: TermPolicyProcessCopyContentUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyProcessCopyContentUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                { provide: MessageService, useValue: messageService },
            ],
        }).compile();

        useCase = module.get(TermPolicyProcessCopyContentUseCase);
    });

    describe('execute', () => {
        const copyPayload: ITermPolicyCopyContentPayload = {
            termPolicyId: 'term-policy-1',
            contents: [],
            destination: 'public/term-policies/privacy/1',
        };

        it('hands the payload to the term policy domain and reports the destination', async () => {
            const job = buildQueueJob<
                ITermPolicyCopyContentPayload,
                unknown,
                EnumTermPolicyProcess
            >(copyPayload);

            const result = await useCase.execute(job);

            expect(termPolicyService.copyContent).toHaveBeenCalledWith(
                copyPayload
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'termPolicy.queue.copyContent',
                { properties: { termPolicyId: 'term-policy-1' } }
            );
            expect(result).toEqual({
                message: 'termPolicy.queue.copyContent',
                destination: 'public/term-policies/privacy/1',
            });
        });

        it('rethrows the domain QueueException so BullMQ retries the job', async () => {
            const failure = new QueueException(
                'termPolicy.queue.error.copyContent',
                true
            );
            termPolicyService.copyContent.mockRejectedValue(failure);
            const job = buildQueueJob<
                ITermPolicyCopyContentPayload,
                unknown,
                EnumTermPolicyProcess
            >(copyPayload);

            const rejection = useCase.execute(job);

            await expect(rejection).rejects.toBe(failure);
        });
    });
});

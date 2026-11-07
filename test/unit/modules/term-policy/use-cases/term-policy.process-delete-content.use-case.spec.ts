import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import type { ITermPolicyDeleteContentPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyProcessDeleteContentUseCase } from '@modules/term-policy/use-cases/term-policy.process-delete-content.use-case';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';

describe('TermPolicyProcessDeleteContentUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();

    const payload: ITermPolicyDeleteContentPayload = {
        path: 'term-policies/privacy/1',
    };

    let useCase: TermPolicyProcessDeleteContentUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyProcessDeleteContentUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                { provide: MessageService, useValue: messageService },
            ],
        }).compile();

        useCase = module.get(TermPolicyProcessDeleteContentUseCase);
    });

    describe('execute', () => {
        it('hands the content directory to the term policy domain and reports the path', async () => {
            const job = buildQueueJob<
                ITermPolicyDeleteContentPayload,
                unknown,
                EnumTermPolicyProcess
            >(payload);

            const result = await useCase.execute(job);

            expect(termPolicyService.deleteContentDir).toHaveBeenCalledWith(
                'term-policies/privacy/1'
            );
            expect(result).toEqual({
                message: 'termPolicy.queue.deleteContent',
                path: 'term-policies/privacy/1',
            });
        });

        it('rethrows the domain failure so BullMQ retries the job', async () => {
            const failure = new Error('s3 down');
            termPolicyService.deleteContentDir.mockRejectedValue(failure);
            const job = buildQueueJob<
                ITermPolicyDeleteContentPayload,
                unknown,
                EnumTermPolicyProcess
            >(payload);

            const rejection = useCase.execute(job);

            await expect(rejection).rejects.toBe(failure);
        });
    });
});

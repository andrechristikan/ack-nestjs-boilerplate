import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import type { ITermPolicyDeleteContentPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyProcessDeleteContentUseCase } from '@modules/term-policy/use-cases/term-policy.process-delete-content.use-case';
import { MessageService } from '@common/message/services/message.service';

describe('TermPolicyProcessDeleteContentUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();

    const payload: ITermPolicyDeleteContentPayload = {
        keys: ['term-policies/privacy/1/en-a.hbs'],
    };

    let useCase: TermPolicyProcessDeleteContentUseCase;

    beforeEach(async () => {
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
        it('hands the content keys to the term policy domain and reports the keys', async () => {
            const result = await useCase.execute(payload);

            expect(termPolicyService.deleteContentKeys).toHaveBeenCalledWith([
                'term-policies/privacy/1/en-a.hbs',
            ]);
            expect(result).toEqual({
                message: 'termPolicy.queue.deleteContent',
                keys: ['term-policies/privacy/1/en-a.hbs'],
            });
        });

        it('rethrows the domain failure so BullMQ retries the job', async () => {
            const failure = new Error('s3 down');
            termPolicyService.deleteContentKeys.mockRejectedValue(failure);

            const rejection = useCase.execute(payload);

            await expect(rejection).rejects.toBe(failure);
        });
    });
});

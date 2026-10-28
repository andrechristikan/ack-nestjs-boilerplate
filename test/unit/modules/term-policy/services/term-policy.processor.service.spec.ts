import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { EnumTermPolicyProcess } from '@modules/term-policy/enums/term-policy.enum';
import type { ITermPolicyDeleteContentPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyProcessorService } from '@modules/term-policy/services/term-policy.processor.service';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';

describe('TermPolicyProcessorService', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const termPolicyDomain: MockProxy<TermPolicyDomain> =
        mock<TermPolicyDomain>();
    const payload: ITermPolicyDeleteContentPayload = {
        path: 'term-policies/privacy/1',
    };
    let service: TermPolicyProcessorService;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                TermPolicyProcessorService,
                { provide: TermPolicyDomain, useValue: termPolicyDomain },
            ],
        }).compile();

        service = module.get(TermPolicyProcessorService);
    });

    describe('processDeleteContent', () => {
        it('hands the content directory to the term policy domain and reports the path', async () => {
            const job = buildQueueJob<
                ITermPolicyDeleteContentPayload,
                unknown,
                EnumTermPolicyProcess
            >(payload);

            const result = await service.processDeleteContent(job);

            expect(termPolicyDomain.deleteContentDir).toHaveBeenCalledWith(
                'term-policies/privacy/1'
            );
            expect(result).toEqual({
                message: 'termPolicy.queue.deleteContent',
                path: 'term-policies/privacy/1',
            });
        });

        it('rethrows the domain failure so BullMQ retries the job', async () => {
            const failure = new Error('s3 down');
            termPolicyDomain.deleteContentDir.mockRejectedValue(failure);
            const job = buildQueueJob<
                ITermPolicyDeleteContentPayload,
                unknown,
                EnumTermPolicyProcess
            >(payload);

            const rejection = service.processDeleteContent(job);

            await expect(rejection).rejects.toBe(failure);
        });
    });

    describe('processUnknown', () => {
        it('throws a fatal QueueException naming the unknown process', () => {
            expect(() => service.processUnknown('unknownProcess')).toThrow(
                expect.objectContaining({
                    message: 'termPolicy.queue.error.unknownProcess',
                    isFatal: true,
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'termPolicy.queue.error.unknownProcess',
                { properties: { process: 'unknownProcess' } }
            );
        });
    });
});

import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MessageService } from '@common/message/services/message.service';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaProcessPurgeExpiredUseCase } from '@modules/mfa/use-cases/mfa.process-purge-expired.use-case';

describe('MfaProcessPurgeExpiredUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();

    let useCase: MfaProcessPurgeExpiredUseCase;

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaProcessPurgeExpiredUseCase,
                { provide: MessageService, useValue: messageService },
                {
                    provide: MfaChallengeService,
                    useValue: mfaChallengeService,
                },
            ],
        }).compile();

        useCase = module.get(MfaProcessPurgeExpiredUseCase);
    });

    describe('execute', () => {
        it('purges the expired challenges and reports the count', async () => {
            mfaChallengeService.purgeExpired.mockResolvedValue(3);

            const result = await useCase.execute();

            expect(mfaChallengeService.purgeExpired).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                message: 'mfa.queue.purgeExpired',
                mfaChallenges: 3,
            });
        });

        it('rejects when the purge rejects', async () => {
            const error = new Error('db down');
            mfaChallengeService.purgeExpired.mockRejectedValue(error);

            await expect(useCase.execute()).rejects.toBe(error);
        });
    });
});

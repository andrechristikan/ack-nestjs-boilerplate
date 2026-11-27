import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MessageService } from '@common/message/services/message.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { PasswordHistoryProcessPurgeExpiredUseCase } from '@modules/password-history/use-cases/password-history.process-purge-expired.use-case';

describe('PasswordHistoryProcessPurgeExpiredUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();

    let useCase: PasswordHistoryProcessPurgeExpiredUseCase;

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PasswordHistoryProcessPurgeExpiredUseCase,
                { provide: MessageService, useValue: messageService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
            ],
        }).compile();

        useCase = module.get(PasswordHistoryProcessPurgeExpiredUseCase);
    });

    describe('execute', () => {
        it('purges the expired password histories and reports the count', async () => {
            passwordHistoryService.purgeExpired.mockResolvedValue(3);

            const result = await useCase.execute();

            expect(passwordHistoryService.purgeExpired).toHaveBeenCalledTimes(
                1
            );
            expect(result).toEqual({
                message: 'passwordHistory.queue.purgeExpired',
                passwordHistories: 3,
            });
        });

        it('rejects when the purge rejects', async () => {
            const error = new Error('db down');
            passwordHistoryService.purgeExpired.mockRejectedValue(error);

            await expect(useCase.execute()).rejects.toBe(error);
        });
    });
});

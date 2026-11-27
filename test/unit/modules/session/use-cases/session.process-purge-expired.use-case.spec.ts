import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MessageService } from '@common/message/services/message.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionProcessPurgeExpiredUseCase } from '@modules/session/use-cases/session.process-purge-expired.use-case';

describe('SessionProcessPurgeExpiredUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();

    let useCase: SessionProcessPurgeExpiredUseCase;

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionProcessPurgeExpiredUseCase,
                { provide: MessageService, useValue: messageService },
                { provide: SessionService, useValue: sessionService },
            ],
        }).compile();

        useCase = module.get(SessionProcessPurgeExpiredUseCase);
    });

    describe('execute', () => {
        it('purges the expired sessions and reports the count', async () => {
            sessionService.purgeExpired.mockResolvedValue(3);

            const result = await useCase.execute();

            expect(sessionService.purgeExpired).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                message: 'session.queue.purgeExpired',
                sessions: 3,
            });
        });

        it('rejects when the purge rejects', async () => {
            const error = new Error('db down');
            sessionService.purgeExpired.mockRejectedValue(error);

            await expect(useCase.execute()).rejects.toBe(error);
        });
    });
});

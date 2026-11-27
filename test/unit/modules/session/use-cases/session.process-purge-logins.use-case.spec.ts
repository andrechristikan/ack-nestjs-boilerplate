import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MessageService } from '@common/message/services/message.service';
import { SessionService } from '@modules/session/services/session.service';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { SessionProcessPurgeLoginsUseCase } from '@modules/session/use-cases/session.process-purge-logins.use-case';

describe('SessionProcessPurgeLoginsUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const payload: ISessionPurgeLoginsPayload = {
        userId: 'user-1',
        sessions: [
            { id: 'session-1', userId: 'user-1' },
            { id: 'session-2', userId: 'user-1' },
        ],
    };
    let useCase: SessionProcessPurgeLoginsUseCase;

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionProcessPurgeLoginsUseCase,
                { provide: MessageService, useValue: messageService },
                { provide: SessionService, useValue: sessionService },
            ],
        }).compile();

        useCase = module.get(SessionProcessPurgeLoginsUseCase);
    });

    describe('execute', () => {
        it('hands the job sessions to the session domain and reports the count', async () => {
            const result = await useCase.execute(payload);

            expect(sessionService.deleteLogins).toHaveBeenCalledTimes(1);
            expect(sessionService.deleteLogins).toHaveBeenCalledWith('user-1', [
                { id: 'session-1', userId: 'user-1' },
                { id: 'session-2', userId: 'user-1' },
            ]);
            expect(result).toEqual({
                message: 'session.queue.purgeLogins',
                countSessions: 2,
            });
        });

        it('rethrows the domain failure so BullMQ retries the job', async () => {
            const failure = new Error('redis down');
            sessionService.deleteLogins.mockRejectedValue(failure);

            const rejection = useCase.execute(payload);

            await expect(rejection).rejects.toBe(failure);
        });
    });
});

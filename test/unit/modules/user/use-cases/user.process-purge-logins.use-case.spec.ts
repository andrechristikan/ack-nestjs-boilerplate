import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MessageService } from '@common/message/services/message.service';
import { SessionService } from '@modules/session/services/session.service';
import type { IUserPurgeLoginsPayload } from '@modules/user/interfaces/user.interface';
import { UserProcessPurgeLoginsUseCase } from '@modules/user/use-cases/user.process-purge-logins.use-case';

describe('UserProcessPurgeLoginsUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const payload: IUserPurgeLoginsPayload = {
        userId: 'user-1',
        sessions: [
            { id: 'session-1', userId: 'user-1' },
            { id: 'session-2', userId: 'user-1' },
        ],
    };
    let useCase: UserProcessPurgeLoginsUseCase;

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserProcessPurgeLoginsUseCase,
                { provide: MessageService, useValue: messageService },
                { provide: SessionService, useValue: sessionService },
            ],
        }).compile();

        useCase = module.get(UserProcessPurgeLoginsUseCase);
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
                message: 'user.queue.auth.purgeLogins',
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

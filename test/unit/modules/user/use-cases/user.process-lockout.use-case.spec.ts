import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserService } from '@modules/user/services/user.service';
import { MessageService } from '@common/message/services/message.service';
import { UserProcessLockoutUseCase } from '@modules/user/use-cases/user.process-lockout.use-case';

describe('UserProcessLockoutUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let useCase: UserProcessLockoutUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const revoked: ISessionRef[] = [{ id: 'session-1' }, { id: 'session-2' }];

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        helperDateService.create.mockReturnValue(now);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                UserProcessLockoutUseCase,
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(UserProcessLockoutUseCase);
    });

    describe('execute', () => {
        it('deactivates the user and revokes its sessions and devices on one transaction', async () => {
            const calls: string[] = [];
            outboxService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userService.deactivateForMaxAttemptInTx.mockImplementation(
                async () => {
                    calls.push('deactivate');

                    return true;
                }
            );
            sessionService.revokeAllByUserInTx.mockImplementation(async () => {
                calls.push('revokeSessions');

                return revoked;
            });

            const result = await useCase.execute('user-1');

            expect(
                userService.deactivateForMaxAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-1');
            expect(sessionService.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'user-1',
                now
            );
            expect(calls).toEqual([
                'begin',
                'deactivate',
                'revokeSessions',
                'commit',
            ]);
            expect(result).toEqual({
                message: 'user.queue.lockout',
                countSessions: 2,
            });
        });

        it('revokes nothing and counts no session when the account is already inactive', async () => {
            userService.deactivateForMaxAttemptInTx.mockResolvedValue(false);

            const result = await useCase.execute('user-1');

            expect(sessionService.revokeAllByUserInTx).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'user.queue.lockout',
                countSessions: 0,
            });
        });

        it('rethrows the transaction failure so BullMQ retries the job', async () => {
            const failure = new Error('database down');
            outboxService.withTransaction.mockRejectedValue(failure);

            const rejection = useCase.execute('user-1');

            await expect(rejection).rejects.toBe(failure);
        });
    });
});

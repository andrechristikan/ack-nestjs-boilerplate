import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DeviceService } from '@modules/device/services/device.service';
import { SessionService } from '@modules/session/services/session.service';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserService } from '@modules/user/services/user.service';
import { MessageService } from '@common/message/services/message.service';
import { UserProcessLockoutUseCase } from '@modules/user/use-cases/user.process-lockout.use-case';

describe('UserProcessLockoutUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
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
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                UserProcessLockoutUseCase,
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                { provide: DeviceService, useValue: deviceService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(UserProcessLockoutUseCase);
    });

    describe('execute', () => {
        it('deactivates the user and revokes its sessions and devices on one transaction, then purges the revoked sessions after commit', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
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
            sessionService.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            deviceService.revokeAllByUserInTx.mockImplementation(async () => {
                calls.push('revokeDevices');
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });

            const result = await useCase.execute('user-1');

            expect(
                userService.deactivateForMaxAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-1');
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'user-1',
                now
            );
            expect(deviceService.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'user-1',
                now
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-1',
                revoked
            );
            expect(calls).toEqual([
                'begin',
                'deactivate',
                'revokeSessions',
                'revokeDevices',
                'commit',
                'purge',
            ]);
            expect(result).toEqual({
                message: 'user.queue.lockout',
                countSessions: 2,
            });
        });

        it('revokes nothing and hands no session to the purge when the account is already inactive', async () => {
            userService.deactivateForMaxAttemptInTx.mockResolvedValue(false);

            const result = await useCase.execute('user-1');

            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();
            expect(deviceService.revokeAllByUserInTx).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith('user-1', []);
            expect(result).toEqual({
                message: 'user.queue.lockout',
                countSessions: 0,
            });
        });

        it('rethrows the transaction failure and purges nothing so BullMQ retries the job', async () => {
            const failure = new Error('database down');
            databaseService.withTransaction.mockRejectedValue(failure);

            const rejection = useCase.execute('user-1');

            await expect(rejection).rejects.toBe(failure);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });
    });
});

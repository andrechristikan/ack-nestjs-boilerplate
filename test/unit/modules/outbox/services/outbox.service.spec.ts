import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import type { Job, Queue } from 'bullmq';
import { Duration } from 'luxon';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumOutboxStatus } from '@generated/prisma-client/client';
import type { Outbox } from '@generated/prisma-client/client';
import { CacheService } from '@common/cache/services/cache.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';
import {
    EnumTermPolicyProcess,
    EnumTermPolicyQueue,
} from '@modules/term-policy/enums/term-policy.enum';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { OutboxDispatchWarnKey } from '@modules/outbox/constants/outbox.constant';
import { EnumOutboxStatusCodeError } from '@modules/outbox/enums/outbox.status-code.enum';
import type {
    IOutboxEffect,
    IOutboxJobPayload,
} from '@modules/outbox/interfaces/outbox.interface';
import { OutboxRepository } from '@modules/outbox/repositories/outbox.repository';
import { OutboxService } from '@modules/outbox/services/outbox.service';

describe('OutboxService', () => {
    const outboxRepository: MockProxy<OutboxRepository> =
        mock<OutboxRepository>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const moduleRef: MockProxy<ModuleRef> = mock<ModuleRef>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const sessionQueue: MockProxy<Queue<IOutboxJobPayload>> =
        mock<Queue<IOutboxJobPayload>>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    const now = new Date('2026-11-11T10:00:00.000Z');

    const purgeEffect: IOutboxEffect = {
        queue: EnumSessionQueue.session,
        name: EnumSessionProcess.purgeLogins,
        data: {
            userId: 'user-1',
            sessions: [{ id: 'session-1' }],
        },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };
    const purgeRow: Outbox = {
        id: 'outbox-1',
        queue: EnumSessionQueue.session,
        name: EnumSessionProcess.purgeLogins,
        data: {
            userId: 'user-1',
            sessions: [{ id: 'session-1' }],
        },
        priority: EnumQueuePriority.high,
        idempotencyKey: 'outbox-1',
        status: EnumOutboxStatus.pending,
        attempts: 0,
        lastError: null,
        enqueuedAt: null,
        completedAt: null,
        failedAt: null,
        createdAt: new Date('2026-11-11T09:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-11-11T09:00:00.000Z'),
        updatedBy: null,
    };

    let service: OutboxService;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, number> = {
                'outbox.pendingAfterInMs': 30000,
                'outbox.sweepBatch': 100,
            };

            return values[key];
        });
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        databaseUtil.toPlainObject.mockImplementation(data => data as never);
        helperDateService.create.mockReturnValue(now);
        moduleRef.get.mockReturnValue(sessionQueue);
        outboxRepository.findManyPendingByIds.mockResolvedValue([]);
        sessionQueue.addBulk.mockResolvedValue([]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OutboxService,
                { provide: OutboxRepository, useValue: outboxRepository },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: ModuleRef, useValue: moduleRef },
                { provide: CacheService, useValue: cacheService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        service = module.get(OutboxService);
    });

    describe('withTransaction', () => {
        it('runs the callback on the opened tx and dispatches its rows after the commit', async () => {
            databaseUtil.createId.mockReturnValue('outbox-1');
            outboxRepository.findManyPendingByIds.mockResolvedValue([purgeRow]);
            sessionQueue.addBulk.mockResolvedValue([
                { data: { outboxId: 'outbox-1' } } as Job<IOutboxJobPayload>,
            ]);

            const callback = vi
                .fn<(openedTx: IDatabaseTransactionClient) => Promise<string>>()
                .mockImplementation(async openedTx => {
                    await service.addInTx(openedTx, purgeEffect);

                    return 'result';
                });

            const result = await service.withTransaction(callback);

            expect(result).toBe('result');
            expect(outboxRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({ id: 'outbox-1' }),
            ]);
            expect(outboxRepository.findManyPendingByIds).toHaveBeenCalledWith([
                'outbox-1',
            ]);
            expect(moduleRef.get).toHaveBeenCalledWith(
                getQueueToken(EnumSessionQueue.session),
                { strict: false }
            );
            expect(sessionQueue.addBulk).toHaveBeenCalledWith([
                {
                    name: EnumSessionProcess.purgeLogins,
                    data: { outboxId: 'outbox-1' },
                    opts: {
                        jobId: 'outbox-1',
                        priority: EnumQueuePriority.high,
                    },
                },
            ]);
        });

        it('dispatches every id added on the tx, by any caller on it', async () => {
            databaseUtil.createId
                .mockReturnValueOnce('outbox-1')
                .mockReturnValueOnce('outbox-2');

            const callback = vi
                .fn<(openedTx: IDatabaseTransactionClient) => Promise<void>>()
                .mockImplementation(async openedTx => {
                    await service.addInTx(openedTx, purgeEffect);
                    await service.addManyInTx(openedTx, [purgeEffect]);
                });

            await service.withTransaction(callback);

            expect(outboxRepository.findManyPendingByIds).toHaveBeenCalledWith([
                'outbox-1',
                'outbox-2',
            ]);
        });

        it('rethrows a failed callback and dispatches nothing', async () => {
            const error = new Error('write failed');
            databaseUtil.createId.mockReturnValue('outbox-1');

            const callback = vi
                .fn<(openedTx: IDatabaseTransactionClient) => Promise<void>>()
                .mockImplementation(async openedTx => {
                    await service.addInTx(openedTx, purgeEffect);
                    throw error;
                });

            await expect(service.withTransaction(callback)).rejects.toBe(error);

            expect(
                outboxRepository.findManyPendingByIds
            ).not.toHaveBeenCalled();
            expect(sessionQueue.addBulk).not.toHaveBeenCalled();
        });

        it('passes the options to the database transaction and reads nothing when no row was added', async () => {
            const callback = vi
                .fn<(openedTx: IDatabaseTransactionClient) => Promise<null>>()
                .mockResolvedValue(null);

            await service.withTransaction(callback, { timeout: 5000 });

            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(
                outboxRepository.findManyPendingByIds
            ).not.toHaveBeenCalled();
        });
    });

    describe('addInTx', () => {
        it('throws when the tx was not opened by withTransaction', async () => {
            await expect(
                service.addInTx(tx, purgeEffect)
            ).rejects.toMatchObject({
                module: 'outbox',
                statusCode: EnumOutboxStatusCodeError.transactionMissing,
                statusCodeKey: 'transactionMissing',
                messagePath: 'outbox.error.transactionMissing',
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
            });

            expect(outboxRepository.createManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('addManyInTx', () => {
        const copyEffect: IOutboxEffect = {
            queue: EnumTermPolicyQueue.termPolicy,
            name: EnumTermPolicyProcess.copyContent,
            data: {
                termPolicyId: 'term-policy-1',
                contents: [],
                destination: 'term-policy/published',
            },
            priority: EnumQueuePriority.high,
            idempotencyKey: 'copyContent:term-policy-1',
        };

        it('inserts pending rows with generated ids, a null key stored as the row id, and returns the ids', async () => {
            databaseUtil.createId.mockReturnValue('outbox-1');

            const callback = vi
                .fn<
                    (openedTx: IDatabaseTransactionClient) => Promise<string[]>
                >()
                .mockImplementation(async openedTx =>
                    service.addManyInTx(openedTx, [purgeEffect])
                );

            const ids = await service.withTransaction(callback);

            expect(ids).toEqual(['outbox-1']);
            expect(
                outboxRepository.findManyByIdempotencyKeysInTx
            ).not.toHaveBeenCalled();
            expect(outboxRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                {
                    id: 'outbox-1',
                    queue: EnumSessionQueue.session,
                    name: EnumSessionProcess.purgeLogins,
                    data: purgeEffect.data,
                    priority: EnumQueuePriority.high,
                    idempotencyKey: 'outbox-1',
                    status: EnumOutboxStatus.pending,
                },
            ]);
        });

        it('returns the existing row id for a keyed effect whose key has a row and inserts the rest in one createMany', async () => {
            databaseUtil.createId.mockReturnValue('outbox-2');
            outboxRepository.findManyByIdempotencyKeysInTx.mockResolvedValue([
                {
                    ...purgeRow,
                    id: 'outbox-existing',
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.copyContent,
                    idempotencyKey: 'copyContent:term-policy-1',
                },
            ]);

            const callback = vi
                .fn<
                    (openedTx: IDatabaseTransactionClient) => Promise<string[]>
                >()
                .mockImplementation(async openedTx =>
                    service.addManyInTx(openedTx, [copyEffect, purgeEffect])
                );

            const ids = await service.withTransaction(callback);

            expect(ids).toEqual(['outbox-existing', 'outbox-2']);
            expect(
                outboxRepository.findManyByIdempotencyKeysInTx
            ).toHaveBeenCalledWith(tx, [
                {
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.copyContent,
                    idempotencyKey: 'copyContent:term-policy-1',
                },
            ]);
            expect(outboxRepository.createManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({
                    id: 'outbox-2',
                    idempotencyKey: 'outbox-2',
                }),
            ]);
            expect(outboxRepository.findManyPendingByIds).toHaveBeenCalledWith([
                'outbox-existing',
                'outbox-2',
            ]);
        });

        it('inserts nothing when every keyed effect already has a row', async () => {
            outboxRepository.findManyByIdempotencyKeysInTx.mockResolvedValue([
                {
                    ...purgeRow,
                    id: 'outbox-existing',
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.copyContent,
                    idempotencyKey: 'copyContent:term-policy-1',
                },
            ]);

            const callback = vi
                .fn<
                    (openedTx: IDatabaseTransactionClient) => Promise<string[]>
                >()
                .mockImplementation(async openedTx =>
                    service.addManyInTx(openedTx, [copyEffect])
                );

            const ids = await service.withTransaction(callback);

            expect(ids).toEqual(['outbox-existing']);
            expect(outboxRepository.createManyInTx).not.toHaveBeenCalled();
        });

        it('matches an existing row on queue, name, and key, and inserts an effect sharing only the key', async () => {
            const deleteEffect: IOutboxEffect = {
                queue: EnumTermPolicyQueue.termPolicy,
                name: EnumTermPolicyProcess.deleteContent,
                data: { path: 'term-policy/draft' },
                priority: EnumQueuePriority.high,
                idempotencyKey: 'copyContent:term-policy-1',
            };
            databaseUtil.createId.mockReturnValue('outbox-2');
            outboxRepository.findManyByIdempotencyKeysInTx.mockResolvedValue([
                {
                    ...purgeRow,
                    id: 'outbox-existing',
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.copyContent,
                    idempotencyKey: 'copyContent:term-policy-1',
                },
            ]);

            const callback = vi
                .fn<
                    (openedTx: IDatabaseTransactionClient) => Promise<string[]>
                >()
                .mockImplementation(async openedTx =>
                    service.addManyInTx(openedTx, [copyEffect, deleteEffect])
                );

            const ids = await service.withTransaction(callback);

            expect(ids).toEqual(['outbox-existing', 'outbox-2']);
            expect(
                outboxRepository.findManyByIdempotencyKeysInTx
            ).toHaveBeenCalledWith(tx, [
                {
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.copyContent,
                    idempotencyKey: 'copyContent:term-policy-1',
                },
                {
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.deleteContent,
                    idempotencyKey: 'copyContent:term-policy-1',
                },
            ]);
            expect(outboxRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({
                    id: 'outbox-2',
                    name: EnumTermPolicyProcess.deleteContent,
                    idempotencyKey: 'copyContent:term-policy-1',
                }),
            ]);
        });

        it('inserts one row for two effects sharing a new key', async () => {
            databaseUtil.createId.mockReturnValue('outbox-1');
            outboxRepository.findManyByIdempotencyKeysInTx.mockResolvedValue(
                []
            );

            const callback = vi
                .fn<
                    (openedTx: IDatabaseTransactionClient) => Promise<string[]>
                >()
                .mockImplementation(async openedTx =>
                    service.addManyInTx(openedTx, [copyEffect, copyEffect])
                );

            const ids = await service.withTransaction(callback);

            expect(ids).toEqual(['outbox-1', 'outbox-1']);
            expect(outboxRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({
                    id: 'outbox-1',
                    idempotencyKey: 'copyContent:term-policy-1',
                }),
            ]);
        });
    });

    describe('add', () => {
        it('inserts the row, then dispatches it', async () => {
            databaseUtil.createId.mockReturnValue('outbox-1');
            outboxRepository.findManyPendingByIds.mockResolvedValue([purgeRow]);

            await service.add(purgeEffect);

            expect(outboxRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({ id: 'outbox-1' }),
            ]);
            expect(outboxRepository.findManyPendingByIds).toHaveBeenCalledWith([
                'outbox-1',
            ]);
            expect(sessionQueue.addBulk).toHaveBeenCalledTimes(1);
        });
    });

    describe('addMany', () => {
        it('inserts the rows, then dispatches them', async () => {
            databaseUtil.createId
                .mockReturnValueOnce('outbox-1')
                .mockReturnValueOnce('outbox-2');

            await service.addMany([purgeEffect, purgeEffect]);

            expect(outboxRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({ id: 'outbox-1' }),
                expect.objectContaining({ id: 'outbox-2' }),
            ]);
            expect(outboxRepository.findManyPendingByIds).toHaveBeenCalledWith([
                'outbox-1',
                'outbox-2',
            ]);
        });
    });

    describe('dispatch', () => {
        const lockoutRow: Outbox = {
            ...purgeRow,
            id: 'outbox-2',
            queue: EnumUserQueue.user,
            name: EnumUserProcess.lockout,
            data: { userId: 'user-1' },
            idempotencyKey: 'outbox-2',
        };

        it('enqueues only the rows still pending, one addBulk per queue, then stamps them enqueued', async () => {
            const userQueue: MockProxy<Queue<IOutboxJobPayload>> =
                mock<Queue<IOutboxJobPayload>>();
            moduleRef.get.mockImplementation(token =>
                token === getQueueToken(EnumUserQueue.user)
                    ? userQueue
                    : sessionQueue
            );
            outboxRepository.findManyPendingByIds.mockResolvedValue([
                purgeRow,
                lockoutRow,
            ]);
            sessionQueue.addBulk.mockResolvedValue([
                { data: { outboxId: 'outbox-1' } } as Job<IOutboxJobPayload>,
            ]);
            userQueue.addBulk.mockResolvedValue([
                { data: { outboxId: 'outbox-2' } } as Job<IOutboxJobPayload>,
            ]);

            await service.dispatch(['outbox-1', 'outbox-2', 'outbox-done']);

            expect(outboxRepository.findManyPendingByIds).toHaveBeenCalledWith([
                'outbox-1',
                'outbox-2',
                'outbox-done',
            ]);
            expect(sessionQueue.addBulk).toHaveBeenCalledWith([
                {
                    name: EnumSessionProcess.purgeLogins,
                    data: { outboxId: 'outbox-1' },
                    opts: {
                        jobId: 'outbox-1',
                        priority: EnumQueuePriority.high,
                    },
                },
            ]);
            expect(userQueue.addBulk).toHaveBeenCalledWith([
                {
                    name: EnumUserProcess.lockout,
                    data: { outboxId: 'outbox-2' },
                    opts: {
                        jobId: 'outbox-2',
                        priority: EnumQueuePriority.high,
                    },
                },
            ]);
            expect(outboxRepository.updateEnqueued).toHaveBeenCalledTimes(1);
            expect(outboxRepository.updateEnqueued).toHaveBeenCalledWith(
                ['outbox-1', 'outbox-2'],
                now
            );
        });

        it('stamps every dispatched row enqueued whatever outboxId the returned jobs carry', async () => {
            outboxRepository.findManyPendingByIds.mockResolvedValue([purgeRow]);
            sessionQueue.addBulk.mockResolvedValue([
                {
                    data: { outboxId: 'outbox-other' },
                } as Job<IOutboxJobPayload>,
            ]);

            await service.dispatch(['outbox-1']);

            expect(outboxRepository.updateEnqueued).toHaveBeenCalledWith(
                ['outbox-1'],
                now
            );
        });

        it('leaves the rows of a rejected addBulk pending, stamps the other queue, and consults the window on a connection error', async () => {
            const userQueue: MockProxy<Queue<IOutboxJobPayload>> =
                mock<Queue<IOutboxJobPayload>>();
            const error = new Error('Connection is closed.');
            moduleRef.get.mockImplementation(token =>
                token === getQueueToken(EnumUserQueue.user)
                    ? userQueue
                    : sessionQueue
            );
            outboxRepository.findManyPendingByIds.mockResolvedValue([
                purgeRow,
                lockoutRow,
            ]);
            sessionQueue.addBulk.mockRejectedValue(error);
            userQueue.addBulk.mockResolvedValue([
                { data: { outboxId: 'outbox-2' } } as Job<IOutboxJobPayload>,
            ]);
            cacheService.isConnectionError.mockReturnValue(true);
            cacheService.isFirstInWindow.mockReturnValue(false);

            await expect(
                service.dispatch(['outbox-1', 'outbox-2'])
            ).resolves.toBeUndefined();

            expect(outboxRepository.updateEnqueued).toHaveBeenCalledWith(
                ['outbox-2'],
                now
            );
            expect(cacheService.isConnectionError).toHaveBeenCalledWith(error);
            expect(cacheService.isFirstInWindow).toHaveBeenCalledWith(
                OutboxDispatchWarnKey
            );
        });

        it('resolves without consulting the window on any other addBulk error', async () => {
            outboxRepository.findManyPendingByIds.mockResolvedValue([purgeRow]);
            sessionQueue.addBulk.mockRejectedValue(new Error('bad job'));
            cacheService.isConnectionError.mockReturnValue(false);

            await expect(
                service.dispatch(['outbox-1'])
            ).resolves.toBeUndefined();

            expect(outboxRepository.updateEnqueued).not.toHaveBeenCalled();
            expect(cacheService.isFirstInWindow).not.toHaveBeenCalled();
        });

        it('resolves when the connection error is the first in its window', async () => {
            outboxRepository.findManyPendingByIds.mockResolvedValue([purgeRow]);
            sessionQueue.addBulk.mockRejectedValue(
                new Error('Connection is closed.')
            );
            cacheService.isConnectionError.mockReturnValue(true);
            cacheService.isFirstInWindow.mockReturnValue(true);

            await expect(
                service.dispatch(['outbox-1'])
            ).resolves.toBeUndefined();

            expect(cacheService.isFirstInWindow).toHaveBeenCalledTimes(1);
        });

        it('resolves when the pending read fails', async () => {
            outboxRepository.findManyPendingByIds.mockRejectedValue(
                new Error('server selection timeout')
            );

            await expect(
                service.dispatch(['outbox-1'])
            ).resolves.toBeUndefined();

            expect(sessionQueue.addBulk).not.toHaveBeenCalled();
        });

        it('resolves when the enqueued stamp fails', async () => {
            outboxRepository.findManyPendingByIds.mockResolvedValue([purgeRow]);
            sessionQueue.addBulk.mockResolvedValue([
                { data: { outboxId: 'outbox-1' } } as Job<IOutboxJobPayload>,
            ]);
            outboxRepository.updateEnqueued.mockRejectedValue(
                new Error('server selection timeout')
            );

            await expect(
                service.dispatch(['outbox-1'])
            ).resolves.toBeUndefined();
        });

        it('enqueues nothing when no id is still pending', async () => {
            await service.dispatch(['outbox-done']);

            expect(moduleRef.get).not.toHaveBeenCalled();
            expect(outboxRepository.updateEnqueued).not.toHaveBeenCalled();
        });
    });

    describe('load', () => {
        it('returns the row by id', async () => {
            outboxRepository.findOneById.mockResolvedValue(purgeRow);

            const row = await service.load('outbox-1');

            expect(row).toBe(purgeRow);
            expect(outboxRepository.findOneById).toHaveBeenCalledWith(
                'outbox-1'
            );
        });

        it('returns null when the row does not exist', async () => {
            outboxRepository.findOneById.mockResolvedValue(null);

            const row = await service.load('outbox-missing');

            expect(row).toBeNull();
        });
    });

    describe('complete', () => {
        it('stamps the row completed with the attempts and the time', async () => {
            await service.complete('outbox-1', 2);

            expect(outboxRepository.updateCompleted).toHaveBeenCalledWith(
                'outbox-1',
                2,
                now
            );
        });
    });

    describe('fail', () => {
        it('stamps the row failed with the attempts, the error, and the time', async () => {
            await service.fail('outbox-1', 3, 'S3 delete failed');

            expect(outboxRepository.updateFailed).toHaveBeenCalledWith(
                'outbox-1',
                3,
                'S3 delete failed',
                now
            );
        });
    });

    describe('updateData', () => {
        it('writes the row data with the patch merged over it', async () => {
            outboxRepository.findOneById.mockResolvedValue({
                ...purgeRow,
                data: { userId: 'user-1', completedSteps: [] },
            });

            await service.updateData('outbox-1', {
                completedSteps: ['email'],
            });

            expect(outboxRepository.updateData).toHaveBeenCalledWith(
                'outbox-1',
                { userId: 'user-1', completedSteps: ['email'] }
            );
        });

        it('writes nothing when the row does not exist', async () => {
            outboxRepository.findOneById.mockResolvedValue(null);

            await service.updateData('outbox-missing', {
                completedSteps: ['email'],
            });

            expect(outboxRepository.updateData).not.toHaveBeenCalled();
        });
    });

    describe('sweep', () => {
        const cutoff = new Date('2026-11-11T09:59:30.000Z');
        const duration = Duration.fromMillis(30000);

        beforeEach(() => {
            helperDateService.createDuration.mockReturnValue(duration);
            helperDateService.backward.mockReturnValue(cutoff);
        });

        it('dispatches the oldest rows pending past the threshold, bounded by the batch, and returns the count', async () => {
            outboxRepository.findManyPendingBefore.mockResolvedValue([
                purgeRow,
            ]);
            sessionQueue.addBulk.mockResolvedValue([
                { data: { outboxId: 'outbox-1' } } as Job<IOutboxJobPayload>,
            ]);

            const result = await service.sweep();

            expect(result).toBe(1);
            expect(helperDateService.createDuration).toHaveBeenCalledWith({
                milliseconds: 30000,
            });
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                duration
            );
            expect(outboxRepository.findManyPendingBefore).toHaveBeenCalledWith(
                cutoff,
                100
            );
            expect(sessionQueue.addBulk).toHaveBeenCalledTimes(1);
            expect(outboxRepository.updateEnqueued).toHaveBeenCalledWith(
                ['outbox-1'],
                now
            );
        });

        it('rejects when the pending read fails', async () => {
            const error = new Error('server selection timeout');
            outboxRepository.findManyPendingBefore.mockRejectedValue(error);

            await expect(service.sweep()).rejects.toBe(error);
        });
    });

    describe('onApplicationBootstrap', () => {
        it('runs the sweep once', async () => {
            helperDateService.backward.mockReturnValue(now);
            outboxRepository.findManyPendingBefore.mockResolvedValue([]);

            await service.onApplicationBootstrap();

            expect(
                outboxRepository.findManyPendingBefore
            ).toHaveBeenCalledTimes(1);
        });
    });
});

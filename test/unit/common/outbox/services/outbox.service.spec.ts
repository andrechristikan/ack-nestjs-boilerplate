import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumOutboxStatus } from '@generated/prisma-client/client';
import type { Outbox } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    EnumTermPolicyProcess,
    EnumTermPolicyQueue,
} from '@modules/term-policy/enums/term-policy.enum';
import {
    EnumUserAuthProcess,
    EnumUserQueue,
} from '@modules/user/enums/user.enum';
import { QueueBase } from '@common/queue/bases/queue.base';
import {
    EnumQueueJobState,
    EnumQueuePriority,
} from '@common/queue/enums/queue.enum';
import type { IQueueJobState } from '@common/queue/interfaces/queue.interface';
import { OutboxDispatchWarnKey } from '@common/outbox/constants/outbox.constant';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxRepository } from '@common/outbox/repositories/outbox.repository';
import { OutboxService } from '@common/outbox/services/outbox.service';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('OutboxService', () => {
    const outboxRepository: MockProxy<OutboxRepository> =
        mock<OutboxRepository>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const moduleRef: MockProxy<ModuleRef> = mock<ModuleRef>();
    let configService: MockProxy<ConfigService>;
    const userQueue: MockProxy<QueueBase> = mock<QueueBase>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    const now = new Date('2026-11-11T10:00:00.000Z');

    const purgeEffect: IOutboxEffect = {
        queue: EnumUserQueue.userAuth,
        name: EnumUserAuthProcess.purgeLogins,
        data: {
            userId: 'user-1',
            sessions: [{ id: 'session-1' }],
        },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };
    const purgeRow: Outbox = {
        id: 'outbox-1',
        queue: EnumUserQueue.userAuth,
        name: EnumUserAuthProcess.purgeLogins,
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
        sweptAt: null,
        completedAt: null,
        failedAt: null,
        createdAt: new Date('2026-11-11T09:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-11-11T09:00:00.000Z'),
        updatedBy: null,
    };

    let service: OutboxService;
    let databaseUtil: DatabaseUtil;

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'outbox.pendingAfterInMs': 30000,
            'outbox.enqueuedAfterInMs': 3600000,
            'outbox.sweepBatch': 100,
        });
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        vi.setSystemTime(now);
        moduleRef.get.mockReturnValue(userQueue);
        outboxRepository.findManyPendingByIds.mockResolvedValue([]);
        userQueue.enqueue.mockResolvedValue();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OutboxService,
                { provide: OutboxRepository, useValue: outboxRepository },
                { provide: DatabaseService, useValue: databaseService },
                ...TestUnitKitProviders,
                { provide: ModuleRef, useValue: moduleRef },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(OutboxService);
        databaseUtil = module.get(DatabaseUtil);
    });

    describe('addInTx', () => {
        it('returns the row id, inserts the row on the tx, and registers one after-commit callback', async () => {
            vi.spyOn(databaseUtil, 'createId').mockReturnValue('outbox-1');

            const id = await service.addInTx(tx, purgeEffect);

            expect(id).toBe('outbox-1');
            expect(outboxRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({ id: 'outbox-1' }),
            ]);
            expect(databaseService.afterCommit).toHaveBeenCalledTimes(1);
            expect(databaseService.afterCommit).toHaveBeenCalledWith(
                tx,
                expect.any(Function)
            );
        });
    });

    describe('addManyInTx', () => {
        const publishEffect: IOutboxEffect = {
            queue: EnumTermPolicyQueue.termPolicy,
            name: EnumTermPolicyProcess.publish,
            data: { termPolicyId: 'term-policy-1' },
            priority: EnumQueuePriority.medium,
            idempotencyKey: 'publish:term-policy-1',
        };

        it('registers one after-commit callback on the first add on a tx, none on a second add, and its own on another tx', async () => {
            const otherTx: MockProxy<IDatabaseTransactionClient> =
                mock<IDatabaseTransactionClient>();

            await service.addManyInTx(tx, [purgeEffect]);

            expect(databaseService.afterCommit).toHaveBeenCalledTimes(1);
            expect(databaseService.afterCommit).toHaveBeenCalledWith(
                tx,
                expect.any(Function)
            );

            await service.addManyInTx(tx, [purgeEffect]);

            expect(databaseService.afterCommit).toHaveBeenCalledTimes(1);

            await service.addManyInTx(otherTx, [purgeEffect]);

            expect(databaseService.afterCommit).toHaveBeenCalledTimes(2);
            expect(databaseService.afterCommit).toHaveBeenLastCalledWith(
                otherTx,
                expect.any(Function)
            );
        });

        it('dispatches every id added on the tx, an existing row id included, when the registered callback runs', async () => {
            vi.spyOn(databaseUtil, 'createId').mockReturnValue('outbox-2');
            outboxRepository.findManyByIdempotencyKeysInTx.mockResolvedValue([
                {
                    ...purgeRow,
                    id: 'outbox-existing',
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.publish,
                    idempotencyKey: 'publish:term-policy-1',
                },
            ]);
            outboxRepository.findManyPendingByIds.mockResolvedValue([purgeRow]);
            const callbacks: Array<() => Promise<void>> = [];
            databaseService.afterCommit.mockImplementation((_tx, captured) => {
                callbacks.push(captured);
            });

            await service.addManyInTx(tx, [publishEffect]);
            await service.addManyInTx(tx, [purgeEffect]);

            expect(
                outboxRepository.findManyPendingByIds
            ).not.toHaveBeenCalled();

            expect(callbacks).toHaveLength(1);

            await callbacks[0]!();

            expect(outboxRepository.findManyPendingByIds).toHaveBeenCalledWith([
                'outbox-existing',
                'outbox-2',
            ]);
            expect(userQueue.enqueue).toHaveBeenCalledWith([purgeRow]);
            expect(outboxRepository.updateEnqueued).toHaveBeenCalledWith(
                ['outbox-1'],
                now
            );
        });

        it('inserts pending rows with generated ids, a null key stored as the row id, and returns the ids', async () => {
            vi.spyOn(databaseUtil, 'createId').mockReturnValue('outbox-1');

            const ids = await service.addManyInTx(tx, [purgeEffect]);

            expect(ids).toEqual(['outbox-1']);
            expect(
                outboxRepository.findManyByIdempotencyKeysInTx
            ).not.toHaveBeenCalled();
            expect(outboxRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                {
                    id: 'outbox-1',
                    queue: EnumUserQueue.userAuth,
                    name: EnumUserAuthProcess.purgeLogins,
                    data: purgeEffect.data,
                    priority: EnumQueuePriority.high,
                    idempotencyKey: 'outbox-1',
                    status: EnumOutboxStatus.pending,
                },
            ]);
        });

        it('returns the existing row id for a keyed effect whose key has a row and inserts the rest in one createMany', async () => {
            vi.spyOn(databaseUtil, 'createId').mockReturnValue('outbox-2');
            outboxRepository.findManyByIdempotencyKeysInTx.mockResolvedValue([
                {
                    ...purgeRow,
                    id: 'outbox-existing',
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.publish,
                    idempotencyKey: 'publish:term-policy-1',
                },
            ]);

            const ids = await service.addManyInTx(tx, [
                publishEffect,
                purgeEffect,
            ]);

            expect(ids).toEqual(['outbox-existing', 'outbox-2']);
            expect(
                outboxRepository.findManyByIdempotencyKeysInTx
            ).toHaveBeenCalledWith(tx, [
                {
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.publish,
                    idempotencyKey: 'publish:term-policy-1',
                },
            ]);
            expect(outboxRepository.createManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({
                    id: 'outbox-2',
                    idempotencyKey: 'outbox-2',
                }),
            ]);
        });

        it('inserts nothing when every keyed effect already has a row', async () => {
            outboxRepository.findManyByIdempotencyKeysInTx.mockResolvedValue([
                {
                    ...purgeRow,
                    id: 'outbox-existing',
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.publish,
                    idempotencyKey: 'publish:term-policy-1',
                },
            ]);

            const ids = await service.addManyInTx(tx, [publishEffect]);

            expect(ids).toEqual(['outbox-existing']);
            expect(outboxRepository.createManyInTx).not.toHaveBeenCalled();
        });

        it('matches an existing row on queue, name, and key, and inserts an effect sharing only the key', async () => {
            const deleteEffect: IOutboxEffect = {
                queue: EnumTermPolicyQueue.termPolicy,
                name: EnumTermPolicyProcess.deleteContent,
                data: { path: 'term-policy/draft' },
                priority: EnumQueuePriority.high,
                idempotencyKey: 'publish:term-policy-1',
            };
            vi.spyOn(databaseUtil, 'createId').mockReturnValue('outbox-2');
            outboxRepository.findManyByIdempotencyKeysInTx.mockResolvedValue([
                {
                    ...purgeRow,
                    id: 'outbox-existing',
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.publish,
                    idempotencyKey: 'publish:term-policy-1',
                },
            ]);

            const ids = await service.addManyInTx(tx, [
                publishEffect,
                deleteEffect,
            ]);

            expect(ids).toEqual(['outbox-existing', 'outbox-2']);
            expect(
                outboxRepository.findManyByIdempotencyKeysInTx
            ).toHaveBeenCalledWith(tx, [
                {
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.publish,
                    idempotencyKey: 'publish:term-policy-1',
                },
                {
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.deleteContent,
                    idempotencyKey: 'publish:term-policy-1',
                },
            ]);
            expect(outboxRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({
                    id: 'outbox-2',
                    name: EnumTermPolicyProcess.deleteContent,
                    idempotencyKey: 'publish:term-policy-1',
                }),
            ]);
        });

        it('inserts one row for two effects sharing a new key', async () => {
            vi.spyOn(databaseUtil, 'createId').mockReturnValue('outbox-1');
            outboxRepository.findManyByIdempotencyKeysInTx.mockResolvedValue(
                []
            );

            const ids = await service.addManyInTx(tx, [
                publishEffect,
                publishEffect,
            ]);

            expect(ids).toEqual(['outbox-1', 'outbox-1']);
            expect(outboxRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({
                    id: 'outbox-1',
                    idempotencyKey: 'publish:term-policy-1',
                }),
            ]);
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

    describe('updateDataInTx', () => {
        it('writes the row data with the patch merged over it on the given transaction', async () => {
            outboxRepository.findOneByIdInTx.mockResolvedValue({
                ...purgeRow,
                data: { userId: 'user-1', created: null },
            });

            await service.updateDataInTx(tx, 'outbox-1', { created: 3 });

            expect(outboxRepository.findOneByIdInTx).toHaveBeenCalledWith(
                tx,
                'outbox-1'
            );
            expect(outboxRepository.updateDataInTx).toHaveBeenCalledWith(
                tx,
                'outbox-1',
                { userId: 'user-1', created: 3 }
            );
            expect(outboxRepository.findOneById).not.toHaveBeenCalled();
            expect(outboxRepository.updateData).not.toHaveBeenCalled();
        });

        it('writes nothing when the row does not exist', async () => {
            outboxRepository.findOneByIdInTx.mockResolvedValue(null);

            await service.updateDataInTx(tx, 'outbox-missing', { created: 3 });

            expect(outboxRepository.updateDataInTx).not.toHaveBeenCalled();
        });
    });

    describe('sweep', () => {
        const pendingCutoff = new Date('2026-11-11T09:59:30.000Z');
        const enqueuedCutoff = new Date('2026-11-11T09:00:00.000Z');
        const enqueuedRow: Outbox = {
            ...purgeRow,
            status: EnumOutboxStatus.enqueued,
            enqueuedAt: new Date('2026-11-11T08:00:00.000Z'),
            sweptAt: null,
        };

        beforeEach(() => {
            outboxRepository.findManyPendingBefore.mockResolvedValue([]);
            outboxRepository.findManyEnqueuedBefore.mockResolvedValue([]);
        });

        it('dispatches the oldest rows pending past the threshold, bounded by the batch, and returns the count', async () => {
            outboxRepository.findManyPendingBefore.mockResolvedValue([
                purgeRow,
            ]);

            const result = await service.sweep();

            expect(result).toBe(1);
            expect(outboxRepository.findManyPendingBefore).toHaveBeenCalledWith(
                pendingCutoff,
                100
            );
            expect(
                outboxRepository.findManyEnqueuedBefore
            ).toHaveBeenCalledWith(enqueuedCutoff, 100);
            expect(userQueue.getJobState).not.toHaveBeenCalled();
            expect(userQueue.enqueue).toHaveBeenCalledTimes(1);
            expect(outboxRepository.updateEnqueued).toHaveBeenCalledWith(
                ['outbox-1'],
                now
            );
        });

        it('stamps every row both reads returned as swept with one timestamp before the first reconcile and the dispatch', async () => {
            outboxRepository.findManyPendingBefore.mockResolvedValue([
                purgeRow,
            ]);
            outboxRepository.findManyEnqueuedBefore.mockResolvedValue([
                { ...enqueuedRow, id: 'outbox-2', idempotencyKey: 'outbox-2' },
            ]);
            const calls: string[] = [];
            outboxRepository.updateSwept.mockImplementation(async () => {
                calls.push('updateSwept');
            });
            userQueue.getJobState.mockImplementation(async () => {
                calls.push('getJobState');

                return null;
            });
            userQueue.enqueue.mockImplementation(async () => {
                calls.push('enqueue');
            });

            await service.sweep();

            expect(outboxRepository.updateSwept).toHaveBeenCalledTimes(1);
            expect(outboxRepository.updateSwept).toHaveBeenCalledWith(
                ['outbox-1', 'outbox-2'],
                now
            );
            expect(calls).toEqual(['updateSwept', 'getJobState', 'enqueue']);
        });

        it('stamps nothing as swept when both reads return no row', async () => {
            await service.sweep();

            expect(outboxRepository.updateSwept).not.toHaveBeenCalled();
        });

        it('stamps an enqueued row completed with the attempts of its completed job', async () => {
            const jobState: IQueueJobState = {
                state: EnumQueueJobState.completed,
                attemptsMade: 2,
                failedReason: null,
            };
            outboxRepository.findManyEnqueuedBefore.mockResolvedValue([
                enqueuedRow,
            ]);
            userQueue.getJobState.mockResolvedValue(jobState);

            const result = await service.sweep();

            expect(result).toBe(1);
            expect(userQueue.getJobState).toHaveBeenCalledWith('outbox-1');
            expect(outboxRepository.updateCompleted).toHaveBeenCalledWith(
                'outbox-1',
                2,
                now
            );
            expect(userQueue.enqueue).not.toHaveBeenCalled();
        });

        it('stamps an enqueued row failed with the attempts and the reason of its failed job', async () => {
            const jobState: IQueueJobState = {
                state: EnumQueueJobState.failed,
                attemptsMade: 3,
                failedReason: 'S3 delete failed',
            };
            outboxRepository.findManyEnqueuedBefore.mockResolvedValue([
                enqueuedRow,
            ]);
            userQueue.getJobState.mockResolvedValue(jobState);

            const result = await service.sweep();

            expect(result).toBe(1);
            expect(outboxRepository.updateFailed).toHaveBeenCalledWith(
                'outbox-1',
                3,
                'S3 delete failed',
                now
            );
            expect(outboxRepository.updateCompleted).not.toHaveBeenCalled();
        });

        it('stamps an enqueued row failed with an empty reason when its failed job has none', async () => {
            const jobState: IQueueJobState = {
                state: EnumQueueJobState.failed,
                attemptsMade: 3,
                failedReason: null,
            };
            outboxRepository.findManyEnqueuedBefore.mockResolvedValue([
                enqueuedRow,
            ]);
            userQueue.getJobState.mockResolvedValue(jobState);

            await service.sweep();

            expect(outboxRepository.updateFailed).toHaveBeenCalledWith(
                'outbox-1',
                3,
                '',
                now
            );
        });

        it('re-dispatches an enqueued row whose job is gone and stamps it enqueued again', async () => {
            outboxRepository.findManyEnqueuedBefore.mockResolvedValue([
                enqueuedRow,
            ]);
            userQueue.getJobState.mockResolvedValue(null);

            const result = await service.sweep();

            expect(result).toBe(1);
            expect(userQueue.enqueue).toHaveBeenCalledWith([enqueuedRow]);
            expect(outboxRepository.updateEnqueued).toHaveBeenCalledWith(
                ['outbox-1'],
                now
            );
            expect(outboxRepository.updateCompleted).not.toHaveBeenCalled();
            expect(outboxRepository.updateFailed).not.toHaveBeenCalled();
        });

        it('re-dispatches the pending rows and every enqueued row whose job is gone in one enqueue and one stamp', async () => {
            const goneRow2 = {
                ...enqueuedRow,
                id: 'outbox-2',
                idempotencyKey: 'outbox-2',
            };
            const goneRow3 = {
                ...enqueuedRow,
                id: 'outbox-3',
                idempotencyKey: 'outbox-3',
            };
            outboxRepository.findManyPendingBefore.mockResolvedValue([
                purgeRow,
            ]);
            outboxRepository.findManyEnqueuedBefore.mockResolvedValue([
                goneRow2,
                goneRow3,
            ]);
            userQueue.getJobState.mockResolvedValue(null);

            const result = await service.sweep();

            expect(result).toBe(3);
            expect(userQueue.getJobState).toHaveBeenCalledWith('outbox-2');
            expect(userQueue.getJobState).toHaveBeenCalledWith('outbox-3');
            expect(userQueue.enqueue).toHaveBeenCalledTimes(1);
            expect(userQueue.enqueue).toHaveBeenCalledWith([
                purgeRow,
                goneRow2,
                goneRow3,
            ]);
            expect(outboxRepository.updateEnqueued).toHaveBeenCalledTimes(1);
            expect(outboxRepository.updateEnqueued).toHaveBeenCalledWith(
                ['outbox-1', 'outbox-2', 'outbox-3'],
                now
            );
        });

        it('leaves an enqueued row whose job is still active', async () => {
            const jobState: IQueueJobState = {
                state: EnumQueueJobState.active,
                attemptsMade: 1,
                failedReason: null,
            };
            outboxRepository.findManyEnqueuedBefore.mockResolvedValue([
                enqueuedRow,
            ]);
            userQueue.getJobState.mockResolvedValue(jobState);

            const result = await service.sweep();

            expect(result).toBe(0);
            expect(outboxRepository.updateCompleted).not.toHaveBeenCalled();
            expect(outboxRepository.updateFailed).not.toHaveBeenCalled();
            expect(userQueue.enqueue).not.toHaveBeenCalled();
            expect(outboxRepository.updateEnqueued).not.toHaveBeenCalled();
        });

        it('warns on every call, leaves an enqueued row whose job read rejects, dispatches the pending rows, and resolves', async () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('Connection is closed.');
            outboxRepository.findManyPendingBefore.mockResolvedValue([
                purgeRow,
            ]);
            outboxRepository.findManyEnqueuedBefore.mockResolvedValue([
                { ...enqueuedRow, id: 'outbox-3', idempotencyKey: 'outbox-3' },
            ]);
            userQueue.getJobState.mockRejectedValue(error);

            const first = await service.sweep();
            const result = await service.sweep();

            expect(first).toBe(1);
            expect(result).toBe(1);
            expect(userQueue.getJobState).toHaveBeenCalledWith('outbox-3');
            expect(outboxRepository.updateEnqueued).toHaveBeenCalledWith(
                ['outbox-1'],
                now
            );
            expect(outboxRepository.updateCompleted).not.toHaveBeenCalled();
            expect(outboxRepository.updateFailed).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledTimes(2);
            expect(warn).toHaveBeenCalledWith(
                { key: OutboxDispatchWarnKey, err: error },
                'Outbox dispatch failed'
            );
        });

        it('warns on every call, resolves zero, and dispatches nothing when the stale read fails', async () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('server selection timeout');
            outboxRepository.findManyPendingBefore.mockRejectedValue(error);

            await expect(service.sweep()).resolves.toBe(0);
            await expect(service.sweep()).resolves.toBe(0);

            expect(userQueue.getJobState).not.toHaveBeenCalled();
            expect(userQueue.enqueue).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledTimes(2);
            expect(warn).toHaveBeenCalledWith(
                { key: OutboxDispatchWarnKey, err: error },
                'Outbox dispatch failed'
            );
        });
    });

    describe('onApplicationBootstrap', () => {
        it('runs the sweep once', async () => {
            outboxRepository.findManyPendingBefore.mockResolvedValue([]);
            outboxRepository.findManyEnqueuedBefore.mockResolvedValue([]);

            await service.onApplicationBootstrap();

            expect(
                outboxRepository.findManyPendingBefore
            ).toHaveBeenCalledTimes(1);
            expect(
                outboxRepository.findManyEnqueuedBefore
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe('dispatch', () => {
        const termPolicyRow: Outbox = {
            ...purgeRow,
            id: 'outbox-2',
            queue: EnumTermPolicyQueue.termPolicy,
            name: EnumTermPolicyProcess.deleteContent,
            data: { path: 'term-policy/draft' },
            idempotencyKey: 'outbox-2',
        };

        it('enqueues only the rows still pending, one enqueue per queue, then stamps them enqueued', async () => {
            const termPolicyQueue: MockProxy<QueueBase> = mock<QueueBase>();
            moduleRef.get.mockImplementation(token =>
                token === EnumTermPolicyQueue.termPolicy
                    ? termPolicyQueue
                    : userQueue
            );
            outboxRepository.findManyPendingByIds.mockResolvedValue([
                purgeRow,
                termPolicyRow,
            ]);

            await service['dispatch'](['outbox-1', 'outbox-2', 'outbox-done']);

            expect(outboxRepository.findManyPendingByIds).toHaveBeenCalledWith([
                'outbox-1',
                'outbox-2',
                'outbox-done',
            ]);
            expect(moduleRef.get).toHaveBeenCalledWith(EnumUserQueue.userAuth, {
                strict: false,
            });
            expect(moduleRef.get).toHaveBeenCalledWith(
                EnumTermPolicyQueue.termPolicy,
                { strict: false }
            );
            expect(userQueue.enqueue).toHaveBeenCalledTimes(1);
            expect(userQueue.enqueue).toHaveBeenCalledWith([purgeRow]);
            expect(termPolicyQueue.enqueue).toHaveBeenCalledTimes(1);
            expect(termPolicyQueue.enqueue).toHaveBeenCalledWith([
                termPolicyRow,
            ]);
            expect(outboxRepository.updateEnqueued).toHaveBeenCalledTimes(1);
            expect(outboxRepository.updateEnqueued).toHaveBeenCalledWith(
                ['outbox-1', 'outbox-2'],
                now
            );
        });

        it('resolves and reads, enqueues, and stamps nothing when no id is given', async () => {
            await expect(service['dispatch']([])).resolves.toBeUndefined();

            expect(
                outboxRepository.findManyPendingByIds
            ).not.toHaveBeenCalled();
            expect(userQueue.enqueue).not.toHaveBeenCalled();
            expect(outboxRepository.updateEnqueued).not.toHaveBeenCalled();
        });

        it('leaves the rows of a rejected enqueue pending, stamps the other queue, and warns on every connection error', async () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const termPolicyQueue: MockProxy<QueueBase> = mock<QueueBase>();
            const error = new Error('Connection is closed.');
            moduleRef.get.mockImplementation(token =>
                token === EnumTermPolicyQueue.termPolicy
                    ? termPolicyQueue
                    : userQueue
            );
            outboxRepository.findManyPendingByIds.mockResolvedValue([
                purgeRow,
                termPolicyRow,
            ]);
            userQueue.enqueue.mockRejectedValue(error);

            await expect(
                service['dispatch'](['outbox-1', 'outbox-2'])
            ).resolves.toBeUndefined();
            await expect(
                service['dispatch'](['outbox-1', 'outbox-2'])
            ).resolves.toBeUndefined();

            expect(outboxRepository.updateEnqueued).toHaveBeenCalledWith(
                ['outbox-2'],
                now
            );
            expect(warn).toHaveBeenCalledTimes(2);
            expect(warn).toHaveBeenCalledWith(
                { key: OutboxDispatchWarnKey, err: error },
                'Outbox dispatch failed'
            );
        });

        it('leaves the rows unstamped and warns once when the queue class cannot be resolved', async () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('queue class not found');
            moduleRef.get.mockImplementation(() => {
                throw error;
            });
            outboxRepository.findManyPendingByIds.mockResolvedValue([purgeRow]);

            await expect(
                service['dispatch'](['outbox-1'])
            ).resolves.toBeUndefined();

            expect(userQueue.enqueue).not.toHaveBeenCalled();
            expect(outboxRepository.updateEnqueued).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledWith(
                { key: OutboxDispatchWarnKey, err: error },
                'Outbox dispatch failed'
            );
        });

        it('resolves, warns on every call, and leaves the rows unstamped on any other enqueue error', async () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = new Error('bad job');
            outboxRepository.findManyPendingByIds.mockResolvedValue([purgeRow]);
            userQueue.enqueue.mockRejectedValue(error);

            await expect(
                service['dispatch'](['outbox-1'])
            ).resolves.toBeUndefined();
            await expect(
                service['dispatch'](['outbox-1'])
            ).resolves.toBeUndefined();

            expect(outboxRepository.updateEnqueued).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledTimes(2);
            expect(warn).toHaveBeenCalledWith(
                { key: OutboxDispatchWarnKey, err: error },
                'Outbox dispatch failed'
            );
        });

        it('resolves when the pending read fails', async () => {
            outboxRepository.findManyPendingByIds.mockRejectedValue(
                new Error('server selection timeout')
            );

            await expect(
                service['dispatch'](['outbox-1'])
            ).resolves.toBeUndefined();

            expect(userQueue.enqueue).not.toHaveBeenCalled();
        });

        it('resolves when the enqueued stamp fails', async () => {
            outboxRepository.findManyPendingByIds.mockResolvedValue([purgeRow]);
            outboxRepository.updateEnqueued.mockRejectedValue(
                new Error('server selection timeout')
            );

            await expect(
                service['dispatch'](['outbox-1'])
            ).resolves.toBeUndefined();
        });

        it('enqueues nothing when no id is still pending', async () => {
            await service['dispatch'](['outbox-done']);

            expect(moduleRef.get).not.toHaveBeenCalled();
            expect(outboxRepository.updateEnqueued).not.toHaveBeenCalled();
        });
    });
});

import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { EnumOutboxStatus } from '@generated/prisma-client/client';
import type { Outbox, Prisma } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumQueueJobState } from '@common/queue/enums/queue.enum';
import type {
    IOutboxEffect,
    IOutboxReconcileResult,
} from '@common/outbox/interfaces/outbox.interface';
import { OutboxDispatchWarnKey } from '@common/outbox/constants/outbox.constant';
import { OutboxRepository } from '@common/outbox/repositories/outbox.repository';

@Injectable()
export class OutboxService implements OnApplicationBootstrap {
    private readonly logger = new Logger(OutboxService.name);
    private readonly pendingAfterInMs: number;
    private readonly enqueuedAfterInMs: number;
    private readonly sweepBatch: number;
    private readonly idsByTx: WeakMap<IDatabaseTransactionClient, string[]> =
        new WeakMap();

    constructor(
        private readonly outboxRepository: OutboxRepository,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly moduleRef: ModuleRef,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
        this.pendingAfterInMs = this.configService.get<number>(
            'outbox.pendingAfterInMs'
        )!;
        this.enqueuedAfterInMs = this.configService.get<number>(
            'outbox.enqueuedAfterInMs'
        )!;
        this.sweepBatch = this.configService.get<number>('outbox.sweepBatch')!;
    }

    private async enqueue(rows: Outbox[]): Promise<number> {
        const rowsByQueue = new Map<string, Outbox[]>();
        for (const row of rows) {
            const group = rowsByQueue.get(row.queue) ?? [];
            group.push(row);
            rowsByQueue.set(row.queue, group);
        }

        const results = await Promise.all(
            [...rowsByQueue].map(([queueName, group]) =>
                this.enqueueGroup(queueName, group)
            )
        );
        const enqueuedIds = results.flat();
        if (enqueuedIds.length === 0) {
            return 0;
        }

        const enqueuedAt = this.helperDateService.create();
        await this.outboxRepository.updateEnqueued(enqueuedIds, enqueuedAt);

        return enqueuedIds.length;
    }

    private async dispatch(ids: string[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }

        try {
            const rows = await this.outboxRepository.findManyPendingByIds(ids);
            await this.enqueue(rows);
        } catch (error: unknown) {
            this.warnDispatchFailure(error);
        }
    }

    private async reconcile(row: Outbox): Promise<IOutboxReconcileResult> {
        try {
            const queueClass = this.moduleRef.get<QueueBase>(row.queue, {
                strict: false,
            });
            const job = await queueClass.getJobState(row.idempotencyKey);
            if (job === null) {
                return { stamped: false, missingRow: row };
            }

            if (job.state === EnumQueueJobState.completed) {
                await this.complete(row.id, job.attemptsMade);

                return { stamped: true, missingRow: null };
            }

            if (job.state === EnumQueueJobState.failed) {
                await this.fail(
                    row.id,
                    job.attemptsMade,
                    job.failedReason ?? ''
                );

                return { stamped: true, missingRow: null };
            }
        } catch (error: unknown) {
            this.warnDispatchFailure(error);
        }

        return { stamped: false, missingRow: null };
    }

    private async enqueueGroup(
        queueName: string,
        rows: Outbox[]
    ): Promise<string[]> {
        try {
            const queueClass = this.moduleRef.get<QueueBase>(queueName, {
                strict: false,
            });
            await queueClass.enqueue(rows);
        } catch (error: unknown) {
            this.warnDispatchFailure(error);

            return [];
        }

        return rows.map(row => row.id);
    }

    private warnDispatchFailure(error: unknown): void {
        this.logger.warn(
            { key: OutboxDispatchWarnKey, err: error },
            'Outbox dispatch failed'
        );
    }

    private toDedupeKey(
        queue: string,
        name: string,
        idempotencyKey: string
    ): string {
        return JSON.stringify([queue, name, idempotencyKey]);
    }

    async onApplicationBootstrap(): Promise<void> {
        await this.sweep();
    }

    /** Adds the row on the tx and returns its id, or the id of the row its key already has; the row is dispatched after the commit. */
    async addInTx(
        tx: IDatabaseTransactionClient,
        effect: IOutboxEffect
    ): Promise<string> {
        const [id] = await this.addManyInTx(tx, [effect]);

        return id!;
    }

    /** Adds the rows on the tx and returns their ids, an effect whose key already has a row returning that row's id; the rows are dispatched after the commit. */
    async addManyInTx(
        tx: IDatabaseTransactionClient,
        effects: IOutboxEffect[]
    ): Promise<string[]> {
        const keys: Prisma.OutboxQueueNameIdempotencyKeyCompoundUniqueInput[] =
            [];
        for (const effect of effects) {
            if (effect.idempotencyKey !== null) {
                keys.push({
                    queue: effect.queue,
                    name: effect.name,
                    idempotencyKey: effect.idempotencyKey,
                });
            }
        }

        let existing: Outbox[] = [];
        if (keys.length > 0) {
            existing =
                await this.outboxRepository.findManyByIdempotencyKeysInTx(
                    tx,
                    keys
                );
        }

        const idByKey = new Map(
            existing.map(row => [
                this.toDedupeKey(row.queue, row.name, row.idempotencyKey),
                row.id,
            ])
        );

        const ids: string[] = [];
        const rows: Prisma.OutboxCreateManyInput[] = [];
        for (const effect of effects) {
            const key = effect.idempotencyKey;
            let existingId: string | null = null;
            if (key !== null) {
                const lookupKey = this.toDedupeKey(
                    effect.queue,
                    effect.name,
                    key
                );
                existingId = idByKey.get(lookupKey) ?? null;
            }

            if (existingId !== null) {
                ids.push(existingId);
                continue;
            }

            const id = this.databaseUtil.createId();
            const idempotencyKey = key ?? id;
            const data = this.databaseUtil.toPlainObject(effect.data);
            const dedupeKey = this.toDedupeKey(
                effect.queue,
                effect.name,
                idempotencyKey
            );
            idByKey.set(dedupeKey, id);
            rows.push({
                id,
                queue: effect.queue,
                name: effect.name,
                data,
                priority: effect.priority,
                idempotencyKey,
                status: EnumOutboxStatus.pending,
            });
            ids.push(id);
        }

        if (rows.length > 0) {
            await this.outboxRepository.createManyInTx(tx, rows);
        }

        const registered = this.idsByTx.get(tx);
        const txIds = registered ?? null;
        if (txIds === null) {
            const addedIds = [...ids];
            this.idsByTx.set(tx, addedIds);
            this.databaseService.afterCommit(tx, async () =>
                this.dispatch(addedIds)
            );
        } else {
            txIds.push(...ids);
        }

        return ids;
    }

    /** The row by id; null when it does not exist. */
    async load(outboxId: string): Promise<Outbox | null> {
        return this.outboxRepository.findOneById(outboxId);
    }

    async complete(outboxId: string, attempts: number): Promise<void> {
        const completedAt = this.helperDateService.create();
        await this.outboxRepository.updateCompleted(
            outboxId,
            attempts,
            completedAt
        );
    }

    async fail(
        outboxId: string,
        attempts: number,
        lastError: string
    ): Promise<void> {
        const failedAt = this.helperDateService.create();
        await this.outboxRepository.updateFailed(
            outboxId,
            attempts,
            lastError,
            failedAt
        );
    }

    /** Merges the patch over the row's data at the top level; writes nothing when the row does not exist. */
    async updateData(
        outboxId: string,
        patch: Prisma.InputJsonObject
    ): Promise<void> {
        const row = await this.outboxRepository.findOneById(outboxId);
        if (row === null) {
            return;
        }

        await this.outboxRepository.updateData(outboxId, {
            ...(row.data as Prisma.JsonObject),
            ...patch,
        });
    }

    /** Merges the patch over the row's data at the top level; writes nothing when the row does not exist. */
    async updateDataInTx(
        tx: IDatabaseTransactionClient,
        outboxId: string,
        patch: Prisma.InputJsonObject
    ): Promise<void> {
        const row = await this.outboxRepository.findOneByIdInTx(tx, outboxId);
        if (row === null) {
            return;
        }

        await this.outboxRepository.updateDataInTx(tx, outboxId, {
            ...(row.data as Prisma.JsonObject),
            ...patch,
        });
    }

    /** Stamps the rows it reads as swept, then dispatches those pending longer than outbox.pendingAfterInMs and reconciles those enqueued longer than outbox.enqueuedAfterInMs with their job, at most outbox.sweepBatch of each, the rows swept longest ago first and never-swept ones before them; returns the count dispatched or stamped and never throws. */
    async sweep(): Promise<number> {
        const now = this.helperDateService.create();
        const pendingAfter = this.helperDateService.createDuration({
            milliseconds: this.pendingAfterInMs,
        });
        const enqueuedAfter = this.helperDateService.createDuration({
            milliseconds: this.enqueuedAfterInMs,
        });
        const pendingBefore = this.helperDateService.backward(
            now,
            pendingAfter
        );
        const enqueuedBefore = this.helperDateService.backward(
            now,
            enqueuedAfter
        );

        try {
            const [pendingRows, enqueuedRows] = await Promise.all([
                this.outboxRepository.findManyPendingBefore(
                    pendingBefore,
                    this.sweepBatch
                ),
                this.outboxRepository.findManyEnqueuedBefore(
                    enqueuedBefore,
                    this.sweepBatch
                ),
            ]);

            const sweptIds = [...pendingRows, ...enqueuedRows].map(
                row => row.id
            );
            if (sweptIds.length > 0) {
                // Sequential by design: side effects whose order is part of the contract (the swept stamp before the reconcile and the dispatch)
                await this.outboxRepository.updateSwept(sweptIds, now);
            }

            const results = await Promise.all(
                enqueuedRows.map(row => this.reconcile(row))
            );
            let stamped = 0;
            const missingRows: Outbox[] = [];
            for (const result of results) {
                if (result.stamped) {
                    stamped++;
                }

                if (result.missingRow !== null) {
                    missingRows.push(result.missingRow);
                }
            }

            const enqueued = await this.enqueue([
                ...pendingRows,
                ...missingRows,
            ]);

            return stamped + enqueued;
        } catch (error: unknown) {
            this.warnDispatchFailure(error);

            return 0;
        }
    }
}

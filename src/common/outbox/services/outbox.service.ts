import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { EnumOutboxStatus } from '@generated/prisma-client/client';
import type { Outbox, Prisma } from '@generated/prisma-client/client';
import { CacheService } from '@common/cache/services/cache.service';
import type {
    IDatabaseTransactionClient,
    IDatabaseTransactionOptions,
} from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumQueueJobState } from '@common/queue/enums/queue.enum';
import type {
    IOutboxEffect,
    IOutboxJobPayload,
    IOutboxReconcileResult,
} from '@common/outbox/interfaces/outbox.interface';
import { OutboxDispatchWarnKey } from '@common/outbox/constants/outbox.constant';
import { OutboxTransactionMissingException } from '@common/outbox/exceptions/outbox.transaction-missing.exception';
import { OutboxRepository } from '@common/outbox/repositories/outbox.repository';

@Injectable()
export class OutboxService implements OnApplicationBootstrap {
    private readonly logger = new Logger(OutboxService.name);
    private readonly pendingAfterInMs: number;
    private readonly enqueuedAfterInMs: number;
    private readonly sweepBatch: number;
    private readonly idsByTx: Map<IDatabaseTransactionClient, string[]> =
        new Map();

    constructor(
        private readonly outboxRepository: OutboxRepository,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly moduleRef: ModuleRef,
        private readonly cacheService: CacheService,
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

    private async reconcile(row: Outbox): Promise<IOutboxReconcileResult> {
        try {
            const queue = this.moduleRef.get<Queue<IOutboxJobPayload>>(
                getQueueToken(row.queue),
                { strict: false }
            );
            const found = await queue.getJob(row.idempotencyKey);
            const job = found ?? null;
            if (job === null) {
                return { stamped: false, missingRow: row };
            }

            const state = await job.getState();
            if (state === EnumQueueJobState.completed) {
                await this.complete(row.id, job.attemptsMade);

                return { stamped: true, missingRow: null };
            }

            if (state === EnumQueueJobState.failed) {
                await this.fail(row.id, job.attemptsMade, job.failedReason);

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
            const queue = this.moduleRef.get<Queue<IOutboxJobPayload>>(
                getQueueToken(queueName),
                { strict: false }
            );
            await queue.addBulk(
                rows.map(row => ({
                    name: row.name,
                    data: { outboxId: row.id },
                    opts: { jobId: row.idempotencyKey, priority: row.priority },
                }))
            );
        } catch (error: unknown) {
            this.warnDispatchFailure(error);

            return [];
        }

        return rows.map(row => row.id);
    }

    private warnDispatchFailure(error: unknown): void {
        const isConnection = this.cacheService.isConnectionError(error);
        if (isConnection) {
            const isFirst = this.cacheService.isFirstInWindow(
                OutboxDispatchWarnKey
            );
            if (!isFirst) {
                return;
            }
        }

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

    /** Opens a transaction, then dispatches every outbox row added on its tx after the commit. */
    async withTransaction<T>(
        fn: (tx: IDatabaseTransactionClient) => Promise<T>,
        options?: IDatabaseTransactionOptions
    ): Promise<T> {
        const ids: string[] = [];
        const result = await this.databaseService.withTransaction(async tx => {
            this.idsByTx.set(tx, ids);
            try {
                return await fn(tx);
            } finally {
                this.idsByTx.delete(tx);
            }
        }, options);

        await this.dispatch(ids);

        return result;
    }

    async addInTx(
        tx: IDatabaseTransactionClient,
        effect: IOutboxEffect
    ): Promise<string> {
        const [id] = await this.addManyInTx(tx, [effect]);

        return id!;
    }

    async addManyInTx(
        tx: IDatabaseTransactionClient,
        effects: IOutboxEffect[]
    ): Promise<string[]> {
        const registered = this.idsByTx.get(tx);
        const txIds = registered ?? null;
        if (txIds === null) {
            throw new OutboxTransactionMissingException();
        }

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

        txIds.push(...ids);

        return ids;
    }

    /** Inserts the row for an effect with no business write, then dispatches it; returns the row id. */
    async add(effect: IOutboxEffect): Promise<string> {
        return this.withTransaction(async tx => this.addInTx(tx, effect));
    }

    /** Inserts the rows for effects with no business write, then dispatches them; returns the row ids. */
    async addMany(effects: IOutboxEffect[]): Promise<string[]> {
        return this.withTransaction(async tx => this.addManyInTx(tx, effects));
    }

    /** Enqueues the rows among the ids still pending and stamps them; never throws, a failure leaves its rows pending. */
    async dispatch(ids: string[]): Promise<void> {
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

    /** Dispatches the oldest rows pending longer than outbox.pendingAfterInMs and reconciles the oldest enqueued longer than outbox.enqueuedAfterInMs with their job, at most outbox.sweepBatch of each; returns the count dispatched or stamped and never throws. */
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

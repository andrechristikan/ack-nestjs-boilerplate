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
    IOutboxBuffer,
    IOutboxDispatchRow,
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
    private readonly retentionInMs: number;
    private readonly bufferByTx: WeakMap<
        IDatabaseTransactionClient,
        IOutboxBuffer
    > = new WeakMap();

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
        this.retentionInMs = this.configService.get<number>(
            'outbox.retentionInMs'
        )!;
    }

    private async enqueue(rows: IOutboxDispatchRow[]): Promise<number> {
        const rowsByQueue = new Map<string, IOutboxDispatchRow[]>();
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

        const enqueuedAt = this.helperDateService.now();
        await this.outboxRepository.updateEnqueued(enqueuedIds, enqueuedAt);

        return enqueuedIds.length;
    }

    private async dispatch(rows: IOutboxDispatchRow[]): Promise<void> {
        if (rows.length === 0) {
            return;
        }

        try {
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
        rows: IOutboxDispatchRow[]
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

    private getBuffer(tx: IDatabaseTransactionClient): IOutboxBuffer {
        const registered = this.bufferByTx.get(tx);
        const found = registered ?? null;
        if (found !== null) {
            return found;
        }

        const buffer: IOutboxBuffer = {
            rows: [],
            dispatchRows: [],
            idsByKey: new Map(),
        };
        this.bufferByTx.set(tx, buffer);
        this.databaseService.beforeCommit(tx, async () => {
            if (buffer.rows.length > 0) {
                await this.outboxRepository.createManyInTx(tx, buffer.rows);
            }
        });
        this.databaseService.afterCommit(tx, async () =>
            this.dispatch(buffer.dispatchRows)
        );

        return buffer;
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

    /** Buffers the rows on the tx and returns their ids, an effect whose key the tx buffered or whose key has a stored row returning that row's id; one before-commit insert writes the buffer and the after-commit callback dispatches it. */
    async addManyInTx(
        tx: IDatabaseTransactionClient,
        effects: IOutboxEffect[]
    ): Promise<string[]> {
        const buffer = this.getBuffer(tx);
        const keys: Prisma.OutboxQueueNameIdempotencyKeyCompoundUniqueInput[] =
            [];
        for (const effect of effects) {
            if (effect.idempotencyKey === null) {
                continue;
            }

            const dedupeKey = this.toDedupeKey(
                effect.queue,
                effect.name,
                effect.idempotencyKey
            );
            if (!buffer.idsByKey.has(dedupeKey)) {
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

        const storedByKey = new Map(
            existing.map(row => [
                this.toDedupeKey(row.queue, row.name, row.idempotencyKey),
                row,
            ])
        );

        const ids: string[] = [];
        for (const effect of effects) {
            const key = effect.idempotencyKey;
            if (key !== null) {
                const lookupKey = this.toDedupeKey(
                    effect.queue,
                    effect.name,
                    key
                );
                const bufferedId = buffer.idsByKey.get(lookupKey) ?? null;
                if (bufferedId !== null) {
                    ids.push(bufferedId);
                    continue;
                }

                const stored = storedByKey.get(lookupKey) ?? null;
                if (stored !== null) {
                    buffer.idsByKey.set(lookupKey, stored.id);
                    if (stored.status === EnumOutboxStatus.pending) {
                        buffer.dispatchRows.push(stored);
                    }

                    ids.push(stored.id);
                    continue;
                }
            }

            const id = this.databaseUtil.createId();
            const idempotencyKey = key ?? id;
            const dedupeKey = this.toDedupeKey(
                effect.queue,
                effect.name,
                idempotencyKey
            );
            const data = this.databaseUtil.toPlainObject(effect.data);
            buffer.idsByKey.set(dedupeKey, id);
            buffer.rows.push({
                id,
                queue: effect.queue,
                name: effect.name,
                data,
                priority: effect.priority,
                idempotencyKey,
                status: EnumOutboxStatus.pending,
                scrubbedAt: null,
            });
            buffer.dispatchRows.push({
                id,
                queue: effect.queue,
                name: effect.name,
                priority: effect.priority,
                idempotencyKey,
            });
            ids.push(id);
        }

        return ids;
    }

    /** The row by id; null when it does not exist. */
    async load(outboxId: string): Promise<Outbox | null> {
        return this.outboxRepository.findOneById(outboxId);
    }

    async complete(outboxId: string, attempts: number): Promise<void> {
        const completedAt = this.helperDateService.now();
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
        const failedAt = this.helperDateService.now();
        await this.outboxRepository.updateFailed(
            outboxId,
            attempts,
            lastError,
            failedAt
        );
    }

    /** Writes the whole payload as the row's data: the data the job received with the step's changes spread over it; reads no row, writes nothing when the row does not exist. */
    async replaceData(outboxId: string, data: object): Promise<void> {
        const plain = this.databaseUtil.toPlainObject(data);
        await this.outboxRepository.replaceData(outboxId, plain);
    }

    /** Writes the whole payload as the row's data on the given transaction; reads no row, writes nothing when the row does not exist. */
    async replaceDataInTx(
        tx: IDatabaseTransactionClient,
        outboxId: string,
        data: object
    ): Promise<void> {
        const plain = this.databaseUtil.toPlainObject(data);
        await this.outboxRepository.replaceDataInTx(tx, outboxId, plain);
    }

    /** Empties the payload and the last error of every completed or failed row not updated within outbox.retentionInMs, stamps it scrubbed, and returns the count; the row stays, so its key keeps deduplicating. */
    async scrubExpired(): Promise<number> {
        const now = this.helperDateService.now();
        const retention = this.helperDateService.createDuration({
            milliseconds: this.retentionInMs,
        });
        const threshold = this.helperDateService.backward(now, retention);

        return this.outboxRepository.scrubExpired(threshold, now);
    }

    /** Stamps the rows it reads as swept, then dispatches those pending longer than outbox.pendingAfterInMs and reconciles those enqueued longer than outbox.enqueuedAfterInMs with their job, at most outbox.sweepBatch of each, the rows swept longest ago first and never-swept ones before them; returns the count dispatched or stamped and never throws. */
    async sweep(): Promise<number> {
        const now = this.helperDateService.now();
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

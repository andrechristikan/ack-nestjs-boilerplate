import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { Outbox, Prisma } from '@generated/prisma-client/client';

export interface IOutboxRepository {
    findManyByIdempotencyKeysInTx(
        tx: IDatabaseTransactionClient,
        keys: Prisma.OutboxQueueNameIdempotencyKeyCompoundUniqueInput[]
    ): Promise<Outbox[]>;
    findManyPendingByIds(ids: string[]): Promise<Outbox[]>;
    findManyPendingBefore(before: Date, take: number): Promise<Outbox[]>;
    findOneById(id: string): Promise<Outbox | null>;
    createManyInTx(
        tx: IDatabaseTransactionClient,
        rows: Prisma.OutboxCreateManyInput[]
    ): Promise<void>;
    updateEnqueued(ids: string[], enqueuedAt: Date): Promise<void>;
    updateCompleted(
        id: string,
        attempts: number,
        completedAt: Date
    ): Promise<void>;
    updateFailed(
        id: string,
        attempts: number,
        lastError: string,
        failedAt: Date
    ): Promise<void>;
    updateData(id: string, data: Prisma.InputJsonObject): Promise<void>;
}

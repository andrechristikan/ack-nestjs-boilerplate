import { Injectable } from '@nestjs/common';
import { EnumOutboxStatus } from '@generated/prisma-client/client';
import type { Outbox, Prisma } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IOutboxRepository } from '@common/outbox/interfaces/outbox.repository.interface';

@Injectable()
export class OutboxRepository implements IOutboxRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findManyByIdempotencyKeysInTx(
        tx: IDatabaseTransactionClient,
        keys: Prisma.OutboxQueueNameIdempotencyKeyCompoundUniqueInput[]
    ): Promise<Outbox[]> {
        return tx.outbox.findMany({
            where: { OR: keys },
        });
    }

    async findManyPendingByIds(ids: string[]): Promise<Outbox[]> {
        return this.databaseService.client.outbox.findMany({
            where: {
                id: { in: ids },
                status: EnumOutboxStatus.pending,
            },
        });
    }

    async findManyPendingBefore(
        createdBefore: Date,
        take: number
    ): Promise<Outbox[]> {
        return this.databaseService.client.outbox.findMany({
            where: {
                status: EnumOutboxStatus.pending,
                createdAt: { lt: createdBefore },
            },
            orderBy: { createdAt: EnumPaginationOrderDirectionType.asc },
            take,
        });
    }

    async findManyEnqueuedBefore(
        enqueuedBefore: Date,
        take: number
    ): Promise<Outbox[]> {
        return this.databaseService.client.outbox.findMany({
            where: {
                status: EnumOutboxStatus.enqueued,
                enqueuedAt: { lt: enqueuedBefore },
            },
            orderBy: { enqueuedAt: EnumPaginationOrderDirectionType.asc },
            take,
        });
    }

    async findOneById(id: string): Promise<Outbox | null> {
        return this.databaseService.client.outbox.findUnique({
            where: { id },
        });
    }

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        rows: Prisma.OutboxCreateManyInput[]
    ): Promise<void> {
        await tx.outbox.createMany({ data: rows });
    }

    async updateEnqueued(ids: string[], enqueuedAt: Date): Promise<void> {
        await this.databaseService.client.outbox.updateMany({
            where: {
                id: { in: ids },
                status: {
                    in: [EnumOutboxStatus.pending, EnumOutboxStatus.enqueued],
                },
            },
            data: {
                status: EnumOutboxStatus.enqueued,
                enqueuedAt,
            },
        });
    }

    async updateCompleted(
        id: string,
        attempts: number,
        completedAt: Date
    ): Promise<void> {
        await this.databaseService.client.outbox.update({
            where: { id },
            data: {
                status: EnumOutboxStatus.completed,
                attempts,
                completedAt,
            },
        });
    }

    async updateFailed(
        id: string,
        attempts: number,
        lastError: string,
        failedAt: Date
    ): Promise<void> {
        await this.databaseService.client.outbox.update({
            where: { id },
            data: {
                status: EnumOutboxStatus.failed,
                attempts,
                lastError,
                failedAt,
            },
        });
    }

    async updateData(id: string, data: Prisma.InputJsonObject): Promise<void> {
        await this.databaseService.client.outbox.update({
            where: { id },
            data: { data },
        });
    }
}

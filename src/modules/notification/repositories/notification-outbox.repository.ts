import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { Injectable } from '@nestjs/common';
import {
    EnumOutboxEventType,
    EnumOutboxStatus,
    OutboxEvent,
    Prisma,
} from '@prisma/client';

@Injectable()
export class NotificationOutboxRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async create(
        type: EnumOutboxEventType,
        payload: Record<string, unknown>,
        createdBy?: string
    ): Promise<OutboxEvent> {
        return this.databaseService.outboxEvent.create({
            data: {
                type,
                payload: this.databaseUtil.toPlainObject(
                    payload
                ) as Prisma.InputJsonValue,
                createdBy,
            },
        });
    }

    async findPending(
        limit: number,
        now: Date
    ): Promise<OutboxEvent[]> {
        return this.databaseService.outboxEvent.findMany({
            where: {
                status: EnumOutboxStatus.pending,
                OR: [
                    { nextRunAt: null },
                    { nextRunAt: { lte: now } },
                ],
            },
            orderBy: {
                createdAt: Prisma.SortOrder.asc,
            },
            take: limit,
        });
    }

    async findById(id: string): Promise<OutboxEvent | null> {
        return this.databaseService.outboxEvent.findUnique({
            where: { id },
        });
    }

    async markProcessing(id: string, now: Date): Promise<boolean> {
        const updated = await this.databaseService.outboxEvent.updateMany({
            where: {
                id,
                status: EnumOutboxStatus.pending,
                OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
            },
            data: {
                status: EnumOutboxStatus.processing,
                attempts: {
                    increment: 1,
                },
            },
        });

        return updated.count > 0;
    }

    async markProcessed(id: string, processedAt: Date): Promise<void> {
        await this.databaseService.outboxEvent.update({
            where: { id },
            data: {
                status: EnumOutboxStatus.processed,
                processedAt,
                nextRunAt: null,
                errorMessage: null,
                errorStack: null,
            },
        });
    }

    async markFailed(
        id: string,
        status: EnumOutboxStatus,
        error: Error,
        nextRunAt?: Date
    ): Promise<void> {
        await this.databaseService.outboxEvent.update({
            where: { id },
            data: {
                status,
                nextRunAt: nextRunAt ?? null,
                errorMessage: error.message ?? String(error),
                errorStack: error.stack,
            },
        });
    }
}

import { DatabaseService } from '@common/database/services/database.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    AnalyticSnapshot,
    AnalyticSnapshotItem,
    EnumAnalyticSnapshotSignal,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    IAnalyticSnapshotHeaderInput,
    IAnalyticSnapshotItemInput,
    IAnalyticSnapshotValueFilter,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticSnapshotRepository } from '@modules/analytic/interfaces/analytic.snapshot-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticSnapshotRepository implements IAnalyticSnapshotRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async createItems(
        signal: EnumAnalyticSnapshotSignal,
        runId: string,
        runStartedAt: Date,
        items: IAnalyticSnapshotItemInput<Prisma.InputJsonObject>[]
    ): Promise<void> {
        await this.databaseService.client.analyticSnapshotItem.createMany({
            data: items.map(item => ({
                signal,
                runId,
                runStartedAt,
                key: item.key,
                value: item.value,
                occurredAt: item.occurredAt,
                data: item.data,
            })),
        });
    }

    async updateHeaderIfOlder(
        signal: EnumAnalyticSnapshotSignal,
        header: IAnalyticSnapshotHeaderInput
    ): Promise<boolean> {
        const { count } =
            await this.databaseService.client.analyticSnapshot.updateMany({
                where: { signal, startedAt: { lt: header.startedAt } },
                data: {
                    runId: header.runId,
                    startedAt: header.startedAt,
                    count: header.count,
                    metadata: header.metadata,
                    windowStart: header.windowStart,
                    windowEnd: header.windowEnd,
                    computedAt: header.computedAt,
                },
            });

        return count > 0;
    }

    async createHeader(
        signal: EnumAnalyticSnapshotSignal,
        header: IAnalyticSnapshotHeaderInput
    ): Promise<void> {
        await this.databaseService.client.analyticSnapshot.create({
            data: {
                signal,
                runId: header.runId,
                startedAt: header.startedAt,
                count: header.count,
                metadata: header.metadata,
                windowStart: header.windowStart,
                windowEnd: header.windowEnd,
                computedAt: header.computedAt,
            },
        });
    }

    async deleteItemsStartedBefore(
        signal: EnumAnalyticSnapshotSignal,
        startedAt: Date
    ): Promise<void> {
        await this.databaseService.client.analyticSnapshotItem.deleteMany({
            where: { signal, runStartedAt: { lt: startedAt } },
        });
    }

    async deleteItemsOfRun(
        signal: EnumAnalyticSnapshotSignal,
        runId: string
    ): Promise<void> {
        await this.databaseService.client.analyticSnapshotItem.deleteMany({
            where: { signal, runId },
        });
    }

    async findHeader(
        signal: EnumAnalyticSnapshotSignal
    ): Promise<AnalyticSnapshot | null> {
        return this.databaseService.client.analyticSnapshot.findUnique({
            where: { signal },
        });
    }

    async findWithPaginationOffset(
        signal: EnumAnalyticSnapshotSignal,
        runId: string,
        { where, ...params }: IPaginationQueryOffsetParams,
        valueFilter: IAnalyticSnapshotValueFilter | null
    ): Promise<IResponsePaginationReturn<AnalyticSnapshotItem>> {
        return this.paginationService.offset(
            this.databaseService.client.analyticSnapshotItem,
            {
                ...params,
                where: {
                    ...where,
                    signal,
                    runId,
                    ...(valueFilter !== null && valueFilter),
                },
            }
        );
    }

    async findItemByKey(
        signal: EnumAnalyticSnapshotSignal,
        runId: string,
        key: string
    ): Promise<AnalyticSnapshotItem | null> {
        return this.databaseService.client.analyticSnapshotItem.findFirst({
            where: { signal, runId, key },
        });
    }
}

import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type {
    AnalyticSnapshot,
    EnumAnalyticSnapshotSignal,
} from '@generated/prisma-client/client';
import type {
    IAnalyticSnapshotHeaderInput,
    IAnalyticSnapshotItemInput,
    IAnalyticSnapshotValueFilter,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticSnapshotRepository } from '@modules/analytic/interfaces/analytic.snapshot-repository.interface';
import { AnalyticSnapshotListPipelineSchema } from '@modules/analytic/dtos/analytic.snapshot-list-pipeline.dto';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticSnapshotRepository implements IAnalyticSnapshotRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly paginationOffsetUtil: PaginationOffsetUtil,
        private readonly analyticPipelineUtil: AnalyticPipelineUtil
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
    ): Promise<boolean> {
        try {
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

            return true;
        } catch (error: unknown) {
            const isLostWrite = this.databaseUtil.isUniqueCollision(
                error,
                Prisma.AnalyticSnapshotScalarFieldEnum.signal
            );
            if (isLostWrite) {
                return false;
            }

            throw this.databaseUtil.toWriteException(
                error,
                new AppUnknownException(error)
            );
        }
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

    async findListOffset(
        signal: EnumAnalyticSnapshotSignal,
        params: IPaginationQueryOffsetParams,
        valueFilter: IAnalyticSnapshotValueFilter | null
    ): Promise<IResponsePaginationReturn<Prisma.JsonValue>> {
        const result =
            await this.databaseService.client.analyticSnapshot.aggregateRaw({
                pipeline: [
                    { $match: { signal } },
                    {
                        $lookup: {
                            from: 'AnalyticSnapshotItems',
                            let: { runId: '$runId' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ['$signal', signal] },
                                                { $eq: ['$runId', '$$runId'] },
                                            ],
                                        },
                                        ...(valueFilter !== null && {
                                            value: {
                                                $gte: valueFilter.value.gte,
                                            },
                                        }),
                                    },
                                },
                                this.analyticPipelineUtil.pageStage(
                                    params,
                                    '_id'
                                ),
                            ],
                            as: 'page',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            computedAt: {
                                $dateToString: { date: '$computedAt' },
                            },
                            page: 1,
                        },
                    },
                ],
            });
        const parsed = AnalyticSnapshotListPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;
        if (row === undefined) {
            return this.paginationOffsetUtil.page([], 0, params);
        }

        const [facet] = row.page;

        const page = this.paginationOffsetUtil.page(
            facet?.data.map(item => item.data) ?? [],
            facet?.total[0]?.n ?? 0,
            params
        );

        return { ...page, metadata: { computedAt: row.computedAt } };
    }
}

import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import { AnalyticCountRanges } from '@modules/analytic/constants/analytic.constant';
import type {
    IAnalyticCountBucket,
    IAnalyticSnapshotBucketsResult,
    IAnalyticSnapshotHeaderInput,
    IAnalyticSnapshotItem,
    IAnalyticSnapshotResult,
    IAnalyticSnapshotSummary,
    IAnalyticSnapshotValueFilter,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticSnapshotRepository } from '@modules/analytic/repositories/analytic.snapshot.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { z } from 'zod';

@Injectable()
export class AnalyticSnapshotService {
    private readonly writeBatchSize: number;

    constructor(
        private readonly analyticSnapshotRepository: AnalyticSnapshotRepository,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly paginationOffsetUtil: PaginationOffsetUtil,
        private readonly configService: ConfigService
    ) {
        this.writeBatchSize = this.configService.get<number>(
            'analytic.snapshot.writeBatchSize'
        )!;
    }

    private async writeHeader(
        signal: EnumAnalyticSnapshotSignal,
        header: IAnalyticSnapshotHeaderInput
    ): Promise<boolean> {
        const updated =
            await this.analyticSnapshotRepository.updateHeaderIfOlder(
                signal,
                header
            );
        if (updated) {
            return true;
        }

        const existing =
            await this.analyticSnapshotRepository.findHeader(signal);
        if (existing !== null) {
            return false;
        }

        try {
            await this.analyticSnapshotRepository.createHeader(signal, header);

            return true;
        } catch (error: unknown) {
            const isLostWrite = this.databaseUtil.isUniqueCollision(
                error,
                Prisma.AnalyticSnapshotScalarFieldEnum.signal
            );
            if (isLostWrite) {
                return false;
            }

            throw new AppUnknownException(error);
        }
    }

    /** Writes the items of a new run, then swaps the signal's header to it and deletes the superseded items; a run that lost to a later one deletes its own items instead. */
    async replace<
        TData extends Prisma.InputJsonObject,
        TMetadata extends Prisma.InputJsonObject | null,
    >(
        signal: EnumAnalyticSnapshotSignal,
        result: IAnalyticSnapshotResult<TData, TMetadata>
    ): Promise<void> {
        const runId = this.databaseUtil.createId();
        const startedAt = this.helperDateService.create();
        const batchSize = this.writeBatchSize;

        // Sequential by design: side effects whose order is part of the contract (the header after its items, the delete after the header write decides it); a fan-out over an unbounded collection: bounded chunks in turn, each concurrent
        for (
            let offset = 0;
            offset < result.items.length;
            offset += batchSize
        ) {
            await this.analyticSnapshotRepository.createItems(
                signal,
                runId,
                startedAt,
                result.items.slice(offset, offset + batchSize)
            );
        }

        const computedAt = this.helperDateService.create();
        const won = await this.writeHeader(signal, {
            runId,
            startedAt,
            count: result.items.length,
            metadata: result.metadata,
            windowStart: result.windowStart,
            windowEnd: result.windowEnd,
            computedAt,
        });

        if (won) {
            await this.analyticSnapshotRepository.deleteItemsStartedBefore(
                signal,
                startedAt
            );

            return;
        }

        await this.analyticSnapshotRepository.deleteItemsOfRun(signal, runId);
    }

    async getSummary<TMetadata>(
        signal: EnumAnalyticSnapshotSignal,
        metadataSchema: z.ZodType<TMetadata>
    ): Promise<IAnalyticSnapshotSummary<TMetadata>> {
        const header = await this.analyticSnapshotRepository.findHeader(signal);
        if (header === null) {
            return {
                count: 0,
                metadata: null,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
            };
        }

        return {
            count: header.count,
            metadata:
                header.metadata === null
                    ? null
                    : metadataSchema.parse(header.metadata),
            windowStart: header.windowStart,
            windowEnd: header.windowEnd,
            computedAt: header.computedAt,
        };
    }

    async getListOffset<TItem>(
        signal: EnumAnalyticSnapshotSignal,
        params: IPaginationQueryOffsetParams,
        where: IAnalyticSnapshotValueFilter | null,
        dataSchema: z.ZodType<TItem>
    ): Promise<IResponsePaginationReturn<TItem>> {
        const header = await this.analyticSnapshotRepository.findHeader(signal);
        if (header === null) {
            return this.paginationOffsetUtil.page([], 0, {
                skip: params.skip,
                limit: params.limit,
            });
        }

        const page =
            await this.analyticSnapshotRepository.findWithPaginationOffset(
                signal,
                header.runId,
                params,
                where
            );

        return {
            ...page,
            data: page.data.map(item => dataSchema.parse(item.data)),
            metadata: { computedAt: header.computedAt },
        };
    }

    async getBuckets(
        signal: EnumAnalyticSnapshotSignal,
        dataSchema: z.ZodType<IAnalyticCountBucket>
    ): Promise<IAnalyticSnapshotBucketsResult> {
        const page = await this.getListOffset(
            signal,
            {
                skip: 0,
                limit: AnalyticCountRanges.length,
                orderBy: [{ value: EnumPaginationOrderDirectionType.asc }],
            },
            null,
            dataSchema
        );

        return {
            buckets: page.data,
            computedAt: page.metadata?.computedAt ?? null,
        };
    }

    async getOneByKey<TItem>(
        signal: EnumAnalyticSnapshotSignal,
        key: string,
        dataSchema: z.ZodType<TItem>
    ): Promise<IAnalyticSnapshotItem<TItem>> {
        const header = await this.analyticSnapshotRepository.findHeader(signal);
        if (header === null) {
            return { item: null, computedAt: null };
        }

        const item = await this.analyticSnapshotRepository.findItemByKey(
            signal,
            header.runId,
            key
        );
        if (item === null) {
            return { item: null, computedAt: header.computedAt };
        }

        return {
            item: dataSchema.parse(item.data),
            computedAt: header.computedAt,
        };
    }
}

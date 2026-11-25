import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    EnumAnalyticSnapshotSignal,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    IAnalyticSnapshotHeaderInput,
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

        return this.analyticSnapshotRepository.createHeader(signal, header);
    }

    /** Writes the run's items, then swaps the signal's header to the run and deletes the superseded items; a run that lost to a later one deletes its own items instead. */
    async replace<
        TData extends Prisma.InputJsonObject,
        TMetadata extends Prisma.InputJsonObject | null,
    >(
        signal: EnumAnalyticSnapshotSignal,
        result: IAnalyticSnapshotResult<TData, TMetadata>
    ): Promise<void> {
        const runId = this.databaseUtil.createId();
        const startedAt = this.helperDateService.now();
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

        const computedAt = this.helperDateService.now();
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

    /** Writes the header of a signal that carries its result in `metadata`: no item is written or deleted; a run that lost to a later one writes nothing. */
    async replaceHeader<TMetadata extends Prisma.InputJsonObject | null>(
        signal: EnumAnalyticSnapshotSignal,
        result: IAnalyticSnapshotResult<never, TMetadata>
    ): Promise<void> {
        const runId = this.databaseUtil.createId();
        const startedAt = this.helperDateService.now();
        const computedAt = this.helperDateService.now();

        await this.writeHeader(signal, {
            runId,
            startedAt,
            count: 0,
            metadata: result.metadata,
            windowStart: result.windowStart,
            windowEnd: result.windowEnd,
            computedAt,
        });
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
        const page = await this.analyticSnapshotRepository.findListOffset(
            signal,
            params,
            where
        );

        return {
            ...page,
            data: page.data.map(item => dataSchema.parse(item)),
        };
    }
}

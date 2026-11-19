import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
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

export interface IAnalyticSnapshotRepository {
    createItems(
        signal: EnumAnalyticSnapshotSignal,
        runId: string,
        runStartedAt: Date,
        items: IAnalyticSnapshotItemInput<Prisma.InputJsonObject>[]
    ): Promise<void>;
    updateHeaderIfOlder(
        signal: EnumAnalyticSnapshotSignal,
        header: IAnalyticSnapshotHeaderInput
    ): Promise<boolean>;
    createHeader(
        signal: EnumAnalyticSnapshotSignal,
        header: IAnalyticSnapshotHeaderInput
    ): Promise<void>;
    deleteItemsStartedBefore(
        signal: EnumAnalyticSnapshotSignal,
        startedAt: Date
    ): Promise<void>;
    deleteItemsOfRun(
        signal: EnumAnalyticSnapshotSignal,
        runId: string
    ): Promise<void>;
    findHeader(
        signal: EnumAnalyticSnapshotSignal
    ): Promise<AnalyticSnapshot | null>;
    findWithPaginationOffset(
        signal: EnumAnalyticSnapshotSignal,
        runId: string,
        { where, ...params }: IPaginationQueryOffsetParams,
        valueFilter: IAnalyticSnapshotValueFilter | null
    ): Promise<IResponsePaginationReturn<AnalyticSnapshotItem>>;
    findItemByKey(
        signal: EnumAnalyticSnapshotSignal,
        runId: string,
        key: string
    ): Promise<AnalyticSnapshotItem | null>;
}

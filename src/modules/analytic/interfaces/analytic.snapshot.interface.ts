import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type {
    EnumAnalyticSnapshotSignal,
    Prisma,
} from '@generated/prisma-client/client';

export interface IAnalyticSnapshotItemInput<
    TData extends Prisma.InputJsonObject,
> {
    key: string;
    value: number;
    occurredAt: Date | null;
    data: TData;
}

export interface IAnalyticSnapshotResult<
    TData extends Prisma.InputJsonObject,
    TMetadata extends Prisma.InputJsonObject | null,
> {
    items: IAnalyticSnapshotItemInput<TData>[];
    metadata: TMetadata;
    windowStart: Date | null;
    windowEnd: Date | null;
}

export interface IAnalyticSnapshotHeaderInput {
    runId: string;
    startedAt: Date;
    count: number;
    metadata: Prisma.InputJsonObject | null;
    windowStart: Date | null;
    windowEnd: Date | null;
    computedAt: Date;
}

export interface IAnalyticSnapshotSummary<TMetadata> {
    count: number;
    metadata: TMetadata | null;
    windowStart: Date | null;
    windowEnd: Date | null;
    computedAt: Date | null;
}

export interface IAnalyticSnapshotItem<TItem> {
    item: TItem | null;
    computedAt: Date | null;
}

export interface IAnalyticSnapshotValueFilter {
    value: { gte: number };
}

export interface IAnalyticSnapshotListPipeline {
    computedAt: Date;
    page: {
        data: { data: Prisma.JsonValue }[];
        total: { n: number }[];
    }[];
}

export interface IAnalyticRefreshSnapshotPayload {
    signal: EnumAnalyticSnapshotSignal;
}

export interface IAnalyticRefreshSnapshotQueueResponse extends IQueueResponse {
    signal: EnumAnalyticSnapshotSignal;
    count: number;
}

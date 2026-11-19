import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import type { AnalyticSnapshotItem } from '@generated/prisma-client/client';
import type { IAnalyticSnapshotResult } from '@modules/analytic/interfaces/analytic.interface';

export function buildSnapshotResult(
    length: number
): IAnalyticSnapshotResult<{ index: number }, { total: number }> {
    return {
        items: Array.from({ length }, (_, index) => ({
            key: `key-${index}`,
            value: index,
            occurredAt: null,
            data: { index },
        })),
        metadata: { total: length },
        windowStart: new Date('2025-12-02T00:00:00.000Z'),
        windowEnd: new Date('2026-01-01T00:00:00.000Z'),
    };
}

export function buildSnapshotItem(
    data: AnalyticSnapshotItem['data']
): AnalyticSnapshotItem {
    return {
        id: '66a000000000000000000020',
        signal: EnumAnalyticSnapshotSignal.impossibleTravel,
        runId: 'stored-run',
        runStartedAt: new Date('2025-12-31T23:45:00.000Z'),
        key: 'user-1',
        value: 12.5,
        occurredAt: null,
        data,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
    };
}

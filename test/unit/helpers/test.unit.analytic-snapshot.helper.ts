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

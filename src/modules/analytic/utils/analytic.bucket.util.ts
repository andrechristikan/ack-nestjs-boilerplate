import type {
    IAnalyticCountBucket,
    IAnalyticCounted,
    IAnalyticSnapshotResult,
} from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticBucketUtil {
    toBuckets<T extends IAnalyticCounted>(
        rows: T[],
        keyField: keyof T
    ): IAnalyticCountBucket[] {
        return rows.map(row => ({
            key: String(row[keyField]),
            count: row.count,
        }));
    }

    toBucketSnapshot(
        buckets: IAnalyticCountBucket[]
    ): IAnalyticSnapshotResult<IAnalyticCountBucket, null> {
        return {
            items: buckets.map((bucket, index) => ({
                key: bucket.key,
                value: index,
                occurredAt: null,
                data: bucket,
            })),
            metadata: null,
            windowStart: null,
            windowEnd: null,
        };
    }
}

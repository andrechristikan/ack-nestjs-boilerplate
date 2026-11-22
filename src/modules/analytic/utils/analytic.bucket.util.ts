import type {
    IAnalyticCountBucket,
    IAnalyticSnapshotResult,
} from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticBucketUtil {
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

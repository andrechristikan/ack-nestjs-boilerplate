import type {
    IAnalyticCountBucket,
    IAnalyticCounted,
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
}

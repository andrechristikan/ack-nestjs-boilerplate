import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type { ISessionAnalyticSession } from '@modules/session/interfaces/session.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticBucketUtil {
    toBuckets<T extends { count: number }>(
        rows: T[],
        keyField: keyof T
    ): IAnalyticCountBucket[] {
        return rows.map(row => ({
            key: String(row[keyField]),
            count: row.count,
        }));
    }

    toBucketsByBrowser(
        sessions: ISessionAnalyticSession[]
    ): IAnalyticCountBucket[] {
        const counts = new Map<string, number>();
        for (const session of sessions) {
            const key =
                session.userAgent.browser?.name ??
                session.userAgent.os?.name ??
                'unknown';
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        return [...counts.entries()].map(([key, count]) => ({ key, count }));
    }
}

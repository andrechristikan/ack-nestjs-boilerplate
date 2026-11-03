import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type {
    ISessionAnalyticSession,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.interface';

export interface ISessionAnalyticRepository {
    findActiveInRange(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<ISessionAnalyticSession[]>;
    findActiveWithGeoInRange(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<ISessionAnalyticSession[]>;
    countActiveByUser(now: Date): Promise<ISessionAnalyticUserCount[]>;
    groupByCountry(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<IAnalyticCountBucket[]>;
    countAll(): Promise<number>;
    countActive(now: Date): Promise<number>;
}

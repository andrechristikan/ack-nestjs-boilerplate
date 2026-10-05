import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type {
    ISessionAnalyticSession,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.interface';

export interface ISessionAnalyticRepository {
    findActiveWithGeoInRange(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<ISessionAnalyticSession[]>;
    countActiveByUser(): Promise<ISessionAnalyticUserCount[]>;
    groupByCountry(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticCountBucket[]>;
    countAll(): Promise<number>;
    countActive(): Promise<number>;
}

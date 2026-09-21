import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type {
    ISessionAnalyticSession,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.interface';

export interface ISessionAnalyticRepository {
    findActiveWithGeoInRange(
        startDate?: Date,
        endDate?: Date
    ): Promise<ISessionAnalyticSession[]>;
    countActiveByUser(): Promise<ISessionAnalyticUserCount[]>;
    groupByCountry(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticCountBucket[]>;
    countAll(): Promise<number>;
    countActive(): Promise<number>;
}

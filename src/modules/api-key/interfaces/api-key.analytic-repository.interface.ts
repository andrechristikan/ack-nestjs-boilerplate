import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type { IApiKeyAnalyticCreated } from '@modules/api-key/interfaces/api-key.interface';

export interface IApiKeyAnalyticRepository {
    countCreated(startDate: Date, endDate: Date): Promise<number>;
    countActive(now: Date): Promise<number>;
    countExpired(now: Date): Promise<number>;
    countInactive(): Promise<number>;
    groupByType(): Promise<IAnalyticCountBucket[]>;
    findCreatedInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IApiKeyAnalyticCreated[]>;
}

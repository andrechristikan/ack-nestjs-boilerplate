import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';

export interface IWorkspaceAnalyticRepository {
    countCreated(startDate: Date, endDate: Date): Promise<number>;
    groupByVisibility(): Promise<IAnalyticCountBucket[]>;
    countActive(): Promise<number>;
}

import type { IAnalyticProjectCreation } from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticProjectRepository {
    findCreation(
        startDate: Date,
        endDate: Date,
        perWorkspaceLimit: number
    ): Promise<IAnalyticProjectCreation>;
}

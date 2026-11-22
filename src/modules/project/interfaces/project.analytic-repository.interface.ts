import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';

export interface IProjectAnalyticRepository {
    countCreated(startDate: Date, endDate: Date): Promise<number>;
    countByWorkspace(workspaceId: string): Promise<number>;
    groupCreatedPerWorkspace(
        startDate: Date,
        endDate: Date,
        limit: number
    ): Promise<IAnalyticWorkspaceCount[]>;
}

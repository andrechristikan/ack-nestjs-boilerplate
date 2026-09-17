import type { IAnalyticStatusCount } from '@modules/analytic/interfaces/analytic.interface';

export interface IWorkspaceInviteAnalyticRepository {
    groupByStatus(
        startDate: Date,
        endDate: Date,
        workspaceId: string | null
    ): Promise<IAnalyticStatusCount[]>;
}

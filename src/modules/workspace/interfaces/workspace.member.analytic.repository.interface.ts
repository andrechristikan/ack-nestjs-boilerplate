import {
    IAnalyticRoleCount,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IWorkspaceMemberAnalyticRepository {
    groupByRole(workspaceId: string | null): Promise<IAnalyticRoleCount[]>;
    countByWorkspace(workspaceId: string): Promise<number>;
    membershipDistribution(): Promise<IAnalyticWorkspaceCount[]>;
}

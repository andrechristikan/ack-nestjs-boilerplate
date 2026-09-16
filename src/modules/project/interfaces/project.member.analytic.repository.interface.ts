import {
    IAnalyticProjectCount,
    IAnalyticRoleCount,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IProjectMemberAnalyticRepository {
    membershipDistribution(): Promise<IAnalyticProjectCount[]>;
    groupByRole(): Promise<IAnalyticRoleCount[]>;
}

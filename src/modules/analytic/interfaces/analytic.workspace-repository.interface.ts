import type { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IAnalyticCountBucket,
    IAnalyticRoleCount,
    IAnalyticStatusCount,
    IAnalyticWorkspaceCount,
    IAnalyticWorkspaceSummary,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticWorkspaceRepository {
    countCreated(startDate: Date, endDate: Date): Promise<number>;
    groupVisibility(): Promise<IAnalyticCountBucket[]>;
    groupInviteFunnel(
        startDate: Date,
        endDate: Date,
        workspaceId: string | null
    ): Promise<IAnalyticStatusCount[]>;
    groupJoinOutcomes(
        startDate: Date,
        endDate: Date,
        workspaceId: string | null
    ): Promise<IAnalyticStatusCount[]>;
    groupMembership(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>>;
    groupActivityVolume(
        startDate: Date,
        endDate: Date,
        excludedActions: EnumActivityLogAction[],
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>>;
    groupMemberRoles(workspaceId: string): Promise<IAnalyticRoleCount[]>;
    countActivity(
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null,
        excludedActions: EnumActivityLogAction[]
    ): Promise<number>;
    findSummary(
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null,
        excludedActions: EnumActivityLogAction[]
    ): Promise<IAnalyticWorkspaceSummary>;
}

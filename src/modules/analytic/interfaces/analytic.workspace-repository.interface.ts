import type { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IAnalyticRoleCount,
    IAnalyticSnapshotItemInput,
    IAnalyticStatusCount,
    IAnalyticWorkspaceCount,
    IAnalyticWorkspaceSummary,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticWorkspaceRepository {
    countCreated(startDate: Date, endDate: Date): Promise<number>;
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
    findMembership(): Promise<
        IAnalyticSnapshotItemInput<IAnalyticWorkspaceCount>[]
    >;
    groupActivityVolume(
        startDate: Date,
        endDate: Date,
        excludedActions: EnumActivityLogAction[],
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>>;
    groupMemberRoles(workspaceId: string): Promise<IAnalyticRoleCount[]>;
    findSummary(
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null,
        excludedActions: EnumActivityLogAction[]
    ): Promise<IAnalyticWorkspaceSummary>;
}

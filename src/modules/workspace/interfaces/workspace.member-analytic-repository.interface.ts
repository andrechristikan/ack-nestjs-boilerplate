import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IAnalyticRoleCount,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IWorkspaceMemberAnalyticRepository {
    groupByRole(workspaceId: string | null): Promise<IAnalyticRoleCount[]>;
    countByWorkspace(workspaceId: string): Promise<number>;
    groupMembershipDistributionOffset(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>>;
}

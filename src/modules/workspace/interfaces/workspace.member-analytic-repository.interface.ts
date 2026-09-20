import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticRoleCount,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IWorkspaceMemberAnalyticRepository {
    groupByRole(workspaceId: string | null): Promise<IAnalyticRoleCount[]>;
    countByWorkspace(workspaceId: string): Promise<number>;
    membershipDistributionOffset(
        params: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticWorkspaceCount>>;
}

import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticProjectCount,
    IAnalyticRoleCount,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IProjectMemberAnalyticRepository {
    membershipDistributionOffset(
        params: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>>;
    groupByRole(): Promise<IAnalyticRoleCount[]>;
}

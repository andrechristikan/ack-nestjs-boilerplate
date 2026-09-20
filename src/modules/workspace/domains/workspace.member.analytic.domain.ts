import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticRoleCount,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceMemberAnalyticRepository } from '@modules/workspace/repositories/workspace.member.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberAnalyticDomain {
    constructor(
        private readonly workspaceMemberAnalyticRepository: WorkspaceMemberAnalyticRepository
    ) {}

    roles(workspaceId: string | null): Promise<IAnalyticRoleCount[]> {
        return this.workspaceMemberAnalyticRepository.groupByRole(workspaceId);
    }

    countByWorkspace(workspaceId: string): Promise<number> {
        return this.workspaceMemberAnalyticRepository.countByWorkspace(
            workspaceId
        );
    }

    membershipDistributionOffset(
        params: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return this.workspaceMemberAnalyticRepository.membershipDistributionOffset(
            params
        );
    }
}

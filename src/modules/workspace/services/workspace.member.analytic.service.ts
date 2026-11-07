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
export class WorkspaceMemberAnalyticService {
    constructor(
        private readonly workspaceMemberAnalyticRepository: WorkspaceMemberAnalyticRepository
    ) {}

    async getRoles(workspaceId: string | null): Promise<IAnalyticRoleCount[]> {
        return await this.workspaceMemberAnalyticRepository.groupByRole(
            workspaceId
        );
    }

    async getCountByWorkspace(workspaceId: string): Promise<number> {
        return await this.workspaceMemberAnalyticRepository.countByWorkspace(
            workspaceId
        );
    }

    async getMembershipDistributionOffset(
        params: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return await this.workspaceMemberAnalyticRepository.groupMembershipDistributionOffset(
            params
        );
    }
}

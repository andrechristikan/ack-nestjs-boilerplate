import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticProjectCount,
    IAnalyticRoleCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { ProjectMemberAnalyticRepository } from '@modules/project/repositories/project.member.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberAnalyticService {
    constructor(
        private readonly projectMemberAnalyticRepository: ProjectMemberAnalyticRepository
    ) {}

    async getMembershipDistributionOffset(
        params: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        return await this.projectMemberAnalyticRepository.groupMembershipDistributionOffset(
            params
        );
    }

    async getRoles(): Promise<IAnalyticRoleCount[]> {
        return await this.projectMemberAnalyticRepository.groupByRole();
    }
}

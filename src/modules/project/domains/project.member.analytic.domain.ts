import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticProjectCount,
    IAnalyticRoleCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { ProjectMemberAnalyticRepository } from '@modules/project/repositories/project.member.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberAnalyticDomain {
    constructor(
        private readonly projectMemberAnalyticRepository: ProjectMemberAnalyticRepository
    ) {}

    membershipDistributionOffset(
        params: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticProjectCount>> {
        return this.projectMemberAnalyticRepository.membershipDistributionOffset(
            params
        );
    }

    roles(): Promise<IAnalyticRoleCount[]> {
        return this.projectMemberAnalyticRepository.groupByRole();
    }
}

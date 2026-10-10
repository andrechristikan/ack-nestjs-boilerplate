import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticProjectCount,
    IAnalyticRoleCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { ProjectMemberAnalyticRepository } from '@modules/project/repositories/project.member.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberAnalyticDomain {
    constructor(
        private readonly projectMemberAnalyticRepository: ProjectMemberAnalyticRepository,
        private readonly roleDomain: RoleDomain
    ) {}

    membershipDistributionOffset(
        params: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        return this.projectMemberAnalyticRepository.membershipDistributionOffset(
            params
        );
    }

    async roles(): Promise<IAnalyticRoleCount[]> {
        const rows = await this.projectMemberAnalyticRepository.groupByRole();
        const roles = await this.roleDomain.getByIds(
            rows.map(({ key }) => key)
        );
        const roleKeyById = new Map(roles.map(role => [role.id, role.key]));

        return rows.flatMap(({ key, count }) => {
            const roleKey = roleKeyById.get(key);

            return roleKey === undefined ? [] : [{ role: roleKey, count }];
        });
    }
}

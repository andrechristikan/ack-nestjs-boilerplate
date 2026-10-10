import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticRoleCount,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { WorkspaceMemberAnalyticRepository } from '@modules/workspace/repositories/workspace.member.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberAnalyticDomain {
    constructor(
        private readonly workspaceMemberAnalyticRepository: WorkspaceMemberAnalyticRepository,
        private readonly roleDomain: RoleDomain
    ) {}

    async roles(workspaceId: string | null): Promise<IAnalyticRoleCount[]> {
        const rows =
            await this.workspaceMemberAnalyticRepository.groupByRole(
                workspaceId
            );
        const roles = await this.roleDomain.getByIds(
            rows.map(({ key }) => key)
        );
        const roleKeyById = new Map(roles.map(role => [role.id, role.key]));

        return rows.flatMap(({ key, count }) => {
            const roleKey = roleKeyById.get(key);

            return roleKey === undefined ? [] : [{ role: roleKey, count }];
        });
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

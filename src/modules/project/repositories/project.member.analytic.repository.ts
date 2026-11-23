import { EnumRoleScope } from '@generated/prisma-client/client';
import { EnumRoleProjectKey } from '@modules/role/enums/role.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticProjectCount,
    IAnalyticRoleCount,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IProjectMemberAnalyticRepository } from '@modules/project/interfaces/project.member-analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberAnalyticRepository implements IProjectMemberAnalyticRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationOffsetUtil: PaginationOffsetUtil
    ) {}

    async groupMembershipDistributionOffset(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        const { where, skip, limit } = params;
        const scopedWhere: Prisma.ProjectMemberWhereInput = {
            ...where,
            project: { deletedAt: null },
        };

        const [rows, groups] = await Promise.all([
            this.databaseService.client.projectMember.groupBy({
                by: ['projectId'],
                where: scopedWhere,
                _count: { _all: true },
                orderBy: [
                    {
                        _count: {
                            projectId: EnumPaginationOrderDirectionType.desc,
                        },
                    },
                    { projectId: EnumPaginationOrderDirectionType.asc },
                ],
                skip,
                take: limit,
            }),
            this.databaseService.client.projectMember.groupBy({
                by: ['projectId'],
                where: scopedWhere,
            }),
        ]);

        const data = rows.map(row => ({
            projectId: row.projectId,
            count: row._count._all,
        }));

        return this.paginationOffsetUtil.page(data, groups.length, {
            skip,
            limit,
        });
    }

    async groupByRole(): Promise<IAnalyticRoleCount[]> {
        const keys = Object.values(EnumRoleProjectKey);
        const counts = await Promise.all(
            keys.map(key =>
                this.databaseService.client.projectMember.count({
                    where: {
                        project: { deletedAt: null },
                        role: { scope: EnumRoleScope.project, key },
                    },
                })
            )
        );

        return keys
            .map((role, index) => ({ role, count: counts[index] ?? 0 }))
            .filter(row => row.count > 0);
    }
}

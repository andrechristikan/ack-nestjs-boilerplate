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
import { ProjectActiveFilter } from '@modules/project/constants/project.constant';
import type { IProjectMemberAnalyticRepository } from '@modules/project/interfaces/project.member-analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberAnalyticRepository implements IProjectMemberAnalyticRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationOffsetUtil: PaginationOffsetUtil
    ) {}

    async groupMembershipDistributionOffset(
        params: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        const { where, skip, limit } = params;
        const scopedWhere: Prisma.ProjectMemberWhereInput = {
            ...where,
            project: { OR: ProjectActiveFilter },
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
        const rows = await this.databaseService.client.projectMember.groupBy({
            by: ['role'],
            where: { project: { OR: ProjectActiveFilter } },
            _count: { _all: true },
        });
        return rows.map(r => ({ role: r.role, count: r._count._all }));
    }
}

import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticCountBucket,
    IAnalyticProjectCount,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IProjectMemberAnalyticRepository } from '@modules/project/interfaces/project.member-analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberAnalyticRepository implements IProjectMemberAnalyticRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async membershipDistributionOffset(
        params: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        const { where, skip, limit } = params;
        const scopedWhere = where ?? {};

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

        return this.paginationService.offsetPage(data, groups.length, {
            skip,
            limit,
        });
    }

    async groupByRole(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.projectMember.groupBy({
            by: ['roleId'],
            _count: { _all: true },
        });
        return rows.map(r => ({ key: r.roleId, count: r._count._all }));
    }
}

import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type {
    IAnalyticRoleCount,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IWorkspaceMemberAnalyticRepository } from '@modules/workspace/interfaces/workspace.member-analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberAnalyticRepository implements IWorkspaceMemberAnalyticRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async groupByRole(
        workspaceId: string | null
    ): Promise<IAnalyticRoleCount[]> {
        const rows = await this.databaseService.client.workspaceMember.groupBy({
            by: ['role'],
            where: workspaceId ? { workspaceId } : {},
            _count: { _all: true },
        });
        return rows.map(r => ({ role: r.role, count: r._count._all }));
    }

    async countByWorkspace(workspaceId: string): Promise<number> {
        return this.databaseService.client.workspaceMember.count({
            where: { workspaceId },
        });
    }

    async membershipDistributionOffset(
        params: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticWorkspaceCount>> {
        const { where, skip, limit } = params;
        const scopedWhere = where ?? {};

        const [rows, groups] = await Promise.all([
            this.databaseService.client.workspaceMember.groupBy({
                by: ['workspaceId'],
                where: scopedWhere,
                _count: { _all: true },
                orderBy: [
                    {
                        _count: {
                            workspaceId: EnumPaginationOrderDirectionType.desc,
                        },
                    },
                    { workspaceId: EnumPaginationOrderDirectionType.asc },
                ],
                skip,
                take: limit,
            }),
            this.databaseService.client.workspaceMember.groupBy({
                by: ['workspaceId'],
                where: scopedWhere,
            }),
        ]);

        const data = rows.map(row => ({
            workspaceId: row.workspaceId,
            count: row._count._all,
        }));

        return this.paginationService.offsetPage(data, groups.length, {
            skip,
            limit,
        });
    }
}

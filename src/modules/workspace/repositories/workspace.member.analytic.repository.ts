import { EnumRoleScope } from '@generated/prisma-client/client';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
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
        private readonly paginationOffsetUtil: PaginationOffsetUtil
    ) {}

    async groupByRole(
        workspaceId: string | null
    ): Promise<IAnalyticRoleCount[]> {
        const keys = Object.values(EnumRoleWorkspaceKey);
        const counts = await Promise.all(
            keys.map(key =>
                this.databaseService.client.workspaceMember.count({
                    where: {
                        ...(workspaceId !== null && { workspaceId }),
                        workspace: { deletedAt: null },
                        role: { scope: EnumRoleScope.workspace, key },
                    },
                })
            )
        );

        return keys
            .map((role, index) => ({ role, count: counts[index] ?? 0 }))
            .filter(row => row.count > 0);
    }

    async countByWorkspace(workspaceId: string): Promise<number> {
        return this.databaseService.client.workspaceMember.count({
            where: { workspaceId },
        });
    }

    async groupMembershipDistributionOffset(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const { where, skip, limit } = params;
        const scopedWhere: Prisma.WorkspaceMemberWhereInput = {
            ...where,
            workspace: { deletedAt: null },
        };

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

        return this.paginationOffsetUtil.page(data, groups.length, {
            skip,
            limit,
        });
    }
}

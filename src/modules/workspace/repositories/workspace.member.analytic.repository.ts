import { DatabaseService } from '@common/database/services/database.service';
import type {
    IAnalyticRoleCount,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IWorkspaceMemberAnalyticRepository } from '@modules/workspace/interfaces/workspace.member.analytic.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberAnalyticRepository implements IWorkspaceMemberAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

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

    async membershipDistribution(): Promise<IAnalyticWorkspaceCount[]> {
        const rows = await this.databaseService.client.workspaceMember.groupBy({
            by: ['workspaceId'],
            _count: { _all: true },
        });
        return rows.map(r => ({
            workspaceId: r.workspaceId,
            count: r._count._all,
        }));
    }
}

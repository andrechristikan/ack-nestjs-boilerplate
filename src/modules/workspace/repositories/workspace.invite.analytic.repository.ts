import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticStatusCount } from '@modules/analytic/interfaces/analytic.interface';
import type { IWorkspaceInviteAnalyticRepository } from '@modules/workspace/interfaces/workspace.invite-analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceInviteAnalyticRepository implements IWorkspaceInviteAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async groupByStatus(
        startDate: Date,
        endDate: Date,
        workspaceId: string | null
    ): Promise<IAnalyticStatusCount[]> {
        const rows = await this.databaseService.client.workspaceInvite.groupBy({
            by: ['status'],
            where: {
                createdAt: { gte: startDate, lt: endDate },
                ...(workspaceId ? { workspaceId } : {}),
            },
            _count: { _all: true },
        });
        return rows.map(r => ({ status: r.status, count: r._count._all }));
    }
}

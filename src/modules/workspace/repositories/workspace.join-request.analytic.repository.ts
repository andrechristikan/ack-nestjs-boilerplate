import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticStatusCount } from '@modules/analytic/interfaces/analytic.interface';
import type { IWorkspaceJoinRequestAnalyticRepository } from '@modules/workspace/interfaces/workspace.join-request-analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceJoinRequestAnalyticRepository implements IWorkspaceJoinRequestAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async groupByStatus(
        startDate: Date,
        endDate: Date,
        workspaceId: string | null
    ): Promise<IAnalyticStatusCount[]> {
        const rows =
            await this.databaseService.client.workspaceJoinRequest.groupBy({
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

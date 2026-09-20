import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
import type { IProjectAnalyticRepository } from '@modules/project/interfaces/project.analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectAnalyticRepository implements IProjectAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countCreated(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.project.count({
            where: {
                deletedAt: null,
                createdAt: { gte: startDate, lt: endDate },
            },
        });
    }

    async countByWorkspace(workspaceId: string): Promise<number> {
        return this.databaseService.client.project.count({
            where: { workspaceId, deletedAt: null },
        });
    }

    async perWorkspace(): Promise<IAnalyticWorkspaceCount[]> {
        const rows = await this.databaseService.client.project.groupBy({
            by: ['workspaceId'],
            where: { deletedAt: null },
            _count: { _all: true },
        });
        return rows.map(r => ({
            workspaceId: r.workspaceId,
            count: r._count._all,
        }));
    }
}

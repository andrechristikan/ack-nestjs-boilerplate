import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceAnalyticRepository } from '@modules/workspace/interfaces/workspace.analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceAnalyticRepository implements IWorkspaceAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countCreated(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.workspace.count({
            where: {
                OR: WorkspaceActiveFilter,
                createdAt: { gte: startDate, lt: endDate },
            },
        });
    }

    async groupByVisibility(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.workspace.groupBy({
            by: ['isPublic'],
            where: { OR: WorkspaceActiveFilter },
            _count: { _all: true },
        });
        return rows.map(r => ({
            key: r.isPublic ? 'public' : 'private',
            count: r._count._all,
        }));
    }

    async countActive(): Promise<number> {
        return this.databaseService.client.workspace.count({
            where: { OR: WorkspaceActiveFilter },
        });
    }
}

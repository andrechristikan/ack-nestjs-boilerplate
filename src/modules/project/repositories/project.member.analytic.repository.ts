import { DatabaseService } from '@common/database/services/database.service';
import type {
    IAnalyticProjectCount,
    IAnalyticRoleCount,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IProjectMemberAnalyticRepository } from '@modules/project/interfaces/project.member.analytic.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberAnalyticRepository implements IProjectMemberAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async membershipDistribution(): Promise<IAnalyticProjectCount[]> {
        const rows = await this.databaseService.client.projectMember.groupBy({
            by: ['projectId'],
            _count: { _all: true },
        });
        return rows.map(r => ({
            projectId: r.projectId,
            count: r._count._all,
        }));
    }

    async groupByRole(): Promise<IAnalyticRoleCount[]> {
        const rows = await this.databaseService.client.projectMember.groupBy({
            by: ['role'],
            _count: { _all: true },
        });
        return rows.map(r => ({ role: r.role, count: r._count._all }));
    }
}

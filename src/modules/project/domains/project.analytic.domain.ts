import type { IAnalyticProjectCreation } from '@modules/analytic/interfaces/analytic.interface';
import { ProjectAnalyticRepository } from '@modules/project/repositories/project.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectAnalyticDomain {
    constructor(
        private readonly projectAnalyticRepository: ProjectAnalyticRepository
    ) {}

    async getCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticProjectCreation> {
        const [created, perWorkspace] = await Promise.all([
            this.projectAnalyticRepository.countCreated(startDate, endDate),
            this.projectAnalyticRepository.groupByWorkspace(),
        ]);
        return { created, perWorkspace };
    }

    getCountByWorkspace(workspaceId: string): Promise<number> {
        return this.projectAnalyticRepository.countByWorkspace(workspaceId);
    }
}

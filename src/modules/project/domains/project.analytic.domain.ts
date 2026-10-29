import type { IAnalyticProjectCreation } from '@modules/analytic/interfaces/analytic.interface';
import { ProjectAnalyticRepository } from '@modules/project/repositories/project.analytic.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProjectAnalyticDomain {
    private readonly perWorkspaceLimit: number;

    constructor(
        private readonly projectAnalyticRepository: ProjectAnalyticRepository,
        private readonly configService: ConfigService
    ) {
        this.perWorkspaceLimit = this.configService.get<number>(
            'analytic.project.perWorkspaceLimit'
        )!;
    }

    async getCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticProjectCreation> {
        const [created, perWorkspace] = await Promise.all([
            this.projectAnalyticRepository.countCreated(startDate, endDate),
            this.projectAnalyticRepository.groupCreatedPerWorkspace(
                startDate,
                endDate,
                this.perWorkspaceLimit
            ),
        ]);
        return { created, perWorkspace };
    }

    getCountByWorkspace(workspaceId: string): Promise<number> {
        return this.projectAnalyticRepository.countByWorkspace(workspaceId);
    }
}

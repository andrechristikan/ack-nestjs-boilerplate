import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceAnalyticRepository } from '@modules/workspace/repositories/workspace.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceAnalyticDomain {
    constructor(
        private readonly workspaceAnalyticRepository: WorkspaceAnalyticRepository
    ) {}

    async getCountCreated(startDate: Date, endDate: Date): Promise<number> {
        return await this.workspaceAnalyticRepository.countCreated(
            startDate,
            endDate
        );
    }

    async getGroupByVisibility(): Promise<IAnalyticCountBucket[]> {
        return await this.workspaceAnalyticRepository.groupByVisibility();
    }

    async getCountActive(): Promise<number> {
        return await this.workspaceAnalyticRepository.countActive();
    }
}

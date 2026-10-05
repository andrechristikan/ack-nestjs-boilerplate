import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceAnalyticRepository } from '@modules/workspace/repositories/workspace.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceAnalyticDomain {
    constructor(
        private readonly workspaceAnalyticRepository: WorkspaceAnalyticRepository
    ) {}

    getCountCreated(startDate: Date, endDate: Date): Promise<number> {
        return this.workspaceAnalyticRepository.countCreated(
            startDate,
            endDate
        );
    }

    getGroupByVisibility(): Promise<IAnalyticCountBucket[]> {
        return this.workspaceAnalyticRepository.groupByVisibility();
    }

    getCountActive(): Promise<number> {
        return this.workspaceAnalyticRepository.countActive();
    }
}

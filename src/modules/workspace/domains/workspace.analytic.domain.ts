import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceAnalyticRepository } from '@modules/workspace/repositories/workspace.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceAnalyticDomain {
    constructor(
        private readonly workspaceAnalyticRepository: WorkspaceAnalyticRepository
    ) {}

    countCreated(startDate: Date, endDate: Date): Promise<number> {
        return this.workspaceAnalyticRepository.countCreated(
            startDate,
            endDate
        );
    }

    groupByVisibility(): Promise<IAnalyticCountBucket[]> {
        return this.workspaceAnalyticRepository.groupByVisibility();
    }

    countActive(): Promise<number> {
        return this.workspaceAnalyticRepository.countActive();
    }
}

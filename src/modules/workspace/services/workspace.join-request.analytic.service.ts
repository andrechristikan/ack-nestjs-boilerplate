import type { IAnalyticStatusCount } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceJoinRequestAnalyticRepository } from '@modules/workspace/repositories/workspace.join-request.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceJoinRequestAnalyticService {
    constructor(
        private readonly workspaceJoinRequestAnalyticRepository: WorkspaceJoinRequestAnalyticRepository
    ) {}

    async getOutcomes(
        startDate: Date,
        endDate: Date,
        workspaceId: string | null
    ): Promise<IAnalyticStatusCount[]> {
        return await this.workspaceJoinRequestAnalyticRepository.groupByStatus(
            startDate,
            endDate,
            workspaceId
        );
    }
}

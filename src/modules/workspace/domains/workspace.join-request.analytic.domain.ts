import type { IAnalyticStatusCount } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceJoinRequestAnalyticRepository } from '@modules/workspace/repositories/workspace.join-request.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceJoinRequestAnalyticDomain {
    constructor(
        private readonly workspaceJoinRequestAnalyticRepository: WorkspaceJoinRequestAnalyticRepository
    ) {}

    outcomes(
        startDate: Date,
        endDate: Date,
        workspaceId: string | null
    ): Promise<IAnalyticStatusCount[]> {
        return this.workspaceJoinRequestAnalyticRepository.groupByStatus(
            startDate,
            endDate,
            workspaceId
        );
    }
}

import type { IAnalyticStatusCount } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceInviteAnalyticRepository } from '@modules/workspace/repositories/workspace.invite.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceInviteAnalyticDomain {
    constructor(
        private readonly workspaceInviteAnalyticRepository: WorkspaceInviteAnalyticRepository
    ) {}

    funnel(
        startDate: Date,
        endDate: Date,
        workspaceId: string | null
    ): Promise<IAnalyticStatusCount[]> {
        return this.workspaceInviteAnalyticRepository.groupByStatus(
            startDate,
            endDate,
            workspaceId
        );
    }
}

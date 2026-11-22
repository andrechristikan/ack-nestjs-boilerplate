import type { IAnalyticStatusCount } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceInviteAnalyticRepository } from '@modules/workspace/repositories/workspace.invite.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceInviteAnalyticService {
    constructor(
        private readonly workspaceInviteAnalyticRepository: WorkspaceInviteAnalyticRepository
    ) {}

    async getFunnel(
        startDate: Date,
        endDate: Date,
        workspaceId: string | null
    ): Promise<IAnalyticStatusCount[]> {
        return await this.workspaceInviteAnalyticRepository.groupByStatus(
            startDate,
            endDate,
            workspaceId
        );
    }
}

import type {
    IAnalyticRoleCount,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceMemberAnalyticRepository } from '@modules/workspace/repositories/workspace.member.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberAnalyticDomain {
    constructor(
        private readonly workspaceMemberAnalyticRepository: WorkspaceMemberAnalyticRepository
    ) {}

    roles(workspaceId: string | null): Promise<IAnalyticRoleCount[]> {
        return this.workspaceMemberAnalyticRepository.groupByRole(workspaceId);
    }

    countByWorkspace(workspaceId: string): Promise<number> {
        return this.workspaceMemberAnalyticRepository.countByWorkspace(
            workspaceId
        );
    }

    membershipDistribution(): Promise<IAnalyticWorkspaceCount[]> {
        return this.workspaceMemberAnalyticRepository.membershipDistribution();
    }
}

import type {
    IAnalyticProjectCount,
    IAnalyticRoleCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { ProjectMemberAnalyticRepository } from '@modules/project/repositories/project.member.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberAnalyticDomain {
    constructor(
        private readonly projectMemberAnalyticRepository: ProjectMemberAnalyticRepository
    ) {}

    membershipDistribution(): Promise<IAnalyticProjectCount[]> {
        return this.projectMemberAnalyticRepository.membershipDistribution();
    }

    roles(): Promise<IAnalyticRoleCount[]> {
        return this.projectMemberAnalyticRepository.groupByRole();
    }
}

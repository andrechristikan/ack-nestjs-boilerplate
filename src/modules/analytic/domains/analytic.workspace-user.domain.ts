import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import type {
    IAnalyticMetricCount,
    IAnalyticRoleCount,
    IAnalyticStatusCount,
    IAnalyticWorkspaceSummary,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { ProjectAnalyticDomain } from '@modules/project/domains/project.analytic.domain';
import { WorkspaceInviteAnalyticDomain } from '@modules/workspace/domains/workspace.invite.analytic.domain';
import { WorkspaceJoinRequestAnalyticDomain } from '@modules/workspace/domains/workspace.join-request.analytic.domain';
import { WorkspaceMemberAnalyticDomain } from '@modules/workspace/domains/workspace.member.analytic.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticWorkspaceUserDomain {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly workspaceMemberAnalyticDomain: WorkspaceMemberAnalyticDomain,
        private readonly workspaceInviteAnalyticDomain: WorkspaceInviteAnalyticDomain,
        private readonly workspaceJoinRequestAnalyticDomain: WorkspaceJoinRequestAnalyticDomain,
        private readonly projectAnalyticDomain: ProjectAnalyticDomain,
        private readonly activityLogAnalyticDomain: ActivityLogAnalyticDomain
    ) {}

    async summary(
        workspaceId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticWorkspaceSummary> {
        const key = this.analyticDateUtil.workspaceWindowToken(
            workspaceId,
            startDate,
            endDate
        );
        const cached =
            await this.analyticCache.getDashboard<IAnalyticWorkspaceSummary>(
                'workspace.summary',
                key,
                '_'
            );
        if (cached) {
            return cached;
        }

        const [memberCount, projectCount] = await Promise.all([
            this.workspaceMemberAnalyticDomain.countByWorkspace(workspaceId),
            this.projectAnalyticDomain.countByWorkspace(workspaceId),
        ]);

        let activityCount = 0;
        if (startDate && endDate) {
            activityCount =
                await this.activityLogAnalyticDomain.countByWorkspaceInRange(
                    workspaceId,
                    startDate,
                    endDate
                );
        }

        const value: IAnalyticWorkspaceSummary = {
            memberCount,
            projectCount,
            activityCount,
        };
        await this.analyticCache.setDashboard(
            'workspace.summary',
            key,
            '_',
            value
        );
        return value;
    }

    inviteFunnel(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        return this.workspaceInviteAnalyticDomain.funnel(
            startDate,
            endDate,
            workspaceId
        );
    }

    joinOutcomes(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        return this.workspaceJoinRequestAnalyticDomain.outcomes(
            startDate,
            endDate,
            workspaceId
        );
    }

    memberRoles(workspaceId: string): Promise<IAnalyticRoleCount[]> {
        return this.workspaceMemberAnalyticDomain.roles(workspaceId);
    }

    async activity(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const count =
            await this.activityLogAnalyticDomain.countByWorkspaceInRange(
                workspaceId,
                startDate,
                endDate
            );
        return { count };
    }
}

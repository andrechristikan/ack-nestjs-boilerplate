import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticCacheEmptyToken } from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
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
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticWorkspaceSummary> {
        const key = this.analyticDateUtil.workspaceWindowToken(
            workspaceId,
            startDate,
            endDate
        );
        const cached =
            await this.analyticCache.getDashboard<IAnalyticWorkspaceSummary>(
                EnumAnalyticDashboardMetric.workspaceSummary,
                key,
                AnalyticCacheEmptyToken
            );
        if (cached) {
            return cached;
        }

        const memberCountPromise =
            this.workspaceMemberAnalyticDomain.getCountByWorkspace(workspaceId);
        const projectCountPromise =
            this.projectAnalyticDomain.getCountByWorkspace(workspaceId);
        let activityCountPromise: Promise<number> = Promise.resolve(0);
        if (startDate && endDate) {
            activityCountPromise =
                this.activityLogAnalyticDomain.getCountByWorkspaceInRange(
                    workspaceId,
                    startDate,
                    endDate
                );
        }
        const [memberCount, projectCount, activityCount] = await Promise.all([
            memberCountPromise,
            projectCountPromise,
            activityCountPromise,
        ]);

        const value: IAnalyticWorkspaceSummary = {
            memberCount,
            projectCount,
            activityCount,
        };
        await this.analyticCache.setDashboard(
            EnumAnalyticDashboardMetric.workspaceSummary,
            key,
            AnalyticCacheEmptyToken,
            value
        );
        return value;
    }

    inviteFunnel(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        return this.workspaceInviteAnalyticDomain.getFunnel(
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
        return this.workspaceJoinRequestAnalyticDomain.getOutcomes(
            startDate,
            endDate,
            workspaceId
        );
    }

    memberRoles(workspaceId: string): Promise<IAnalyticRoleCount[]> {
        return this.workspaceMemberAnalyticDomain.getRoles(workspaceId);
    }

    async activity(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const count =
            await this.activityLogAnalyticDomain.getCountByWorkspaceInRange(
                workspaceId,
                startDate,
                endDate
            );
        return { count };
    }
}

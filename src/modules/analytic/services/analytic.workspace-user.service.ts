import { CacheService } from '@common/cache/services/cache.service';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticWorkspaceSummaryCacheSchema } from '@modules/analytic/constants/analytic.constant';
import type {
    IAnalyticMetricCount,
    IAnalyticRoleCount,
    IAnalyticStatusCount,
    IAnalyticWorkspaceSummary,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { ProjectAnalyticService } from '@modules/project/services/project.analytic.service';
import { WorkspaceInviteAnalyticService } from '@modules/workspace/services/workspace.invite.analytic.service';
import { WorkspaceJoinRequestAnalyticService } from '@modules/workspace/services/workspace.join-request.analytic.service';
import { WorkspaceMemberAnalyticService } from '@modules/workspace/services/workspace.member.analytic.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticWorkspaceUserService {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly workspaceMemberAnalyticService: WorkspaceMemberAnalyticService,
        private readonly workspaceInviteAnalyticService: WorkspaceInviteAnalyticService,
        private readonly workspaceJoinRequestAnalyticService: WorkspaceJoinRequestAnalyticService,
        private readonly projectAnalyticService: ProjectAnalyticService,
        private readonly activityLogAnalyticService: ActivityLogAnalyticService
    ) {}

    async summary(
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticWorkspaceSummary> {
        const start = this.analyticDateUtil.cacheToken(startDate);
        const end = this.analyticDateUtil.cacheToken(endDate);
        const key = this.analyticCache.buildWorkspaceSummaryKey(
            workspaceId,
            start,
            end
        );

        return this.cacheService.readThrough(
            key,
            AnalyticWorkspaceSummaryCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const [memberCount, projectCount, activityCount] =
                    await Promise.all([
                        this.workspaceMemberAnalyticService.getCountByWorkspace(
                            workspaceId
                        ),
                        this.projectAnalyticService.getCountByWorkspace(
                            workspaceId
                        ),
                        this.activityLogAnalyticService.getCountByWorkspaceInRange(
                            workspaceId,
                            startDate,
                            endDate
                        ),
                    ]);

                return { memberCount, projectCount, activityCount };
            }
        );
    }

    async inviteFunnel(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        return await this.workspaceInviteAnalyticService.getFunnel(
            startDate,
            endDate,
            workspaceId
        );
    }

    async joinOutcomes(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        return await this.workspaceJoinRequestAnalyticService.getOutcomes(
            startDate,
            endDate,
            workspaceId
        );
    }

    async memberRoles(workspaceId: string): Promise<IAnalyticRoleCount[]> {
        return await this.workspaceMemberAnalyticService.getRoles(workspaceId);
    }

    async activity(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const count =
            await this.activityLogAnalyticService.getCountByWorkspaceInRange(
                workspaceId,
                startDate,
                endDate
            );
        return { count };
    }
}

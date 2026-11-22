import { CacheService } from '@common/cache/services/cache.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import { ActivityLogWorkspaceVolumeContract } from '@modules/activity-log/contracts/activity-log.workspace-volume.contract';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticMetricCount,
    IAnalyticRoleCount,
    IAnalyticSnapshotResult,
    IAnalyticStatusCount,
    IAnalyticWorkspaceCount,
    IAnalyticWorkspaceSummary,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticWorkspaceRepository } from '@modules/analytic/repositories/analytic.workspace.repository';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { Injectable } from '@nestjs/common';
import { AnalyticMetricCountCacheSchema } from '@modules/analytic/dtos/analytic.metric-count-cache.dto';
import { AnalyticRoleCountsCacheSchema } from '@modules/analytic/dtos/analytic.role-counts-cache.dto';
import { AnalyticStatusCountsCacheSchema } from '@modules/analytic/dtos/analytic.status-counts-cache.dto';
import { AnalyticWorkspaceCountPageCacheSchema } from '@modules/analytic/dtos/analytic.workspace-count-page-cache.dto';
import { AnalyticWorkspaceMembershipSnapshotDataSchema } from '@modules/analytic/dtos/analytic.workspace-membership-snapshot-data.dto';
import { AnalyticWorkspaceSummaryCacheSchema } from '@modules/analytic/dtos/analytic.workspace-summary-cache.dto';

@Injectable()
export class AnalyticWorkspaceService {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticSnapshotService: AnalyticSnapshotService,
        private readonly analyticWorkspaceRepository: AnalyticWorkspaceRepository
    ) {}

    private dashboardPageKey(
        metric: EnumAnalyticDashboardMetric,
        startDate: Date | null,
        endDate: Date | null,
        skip: number,
        limit: number
    ): string {
        return this.analyticCache.buildDashboardPageKey(
            metric,
            startDate,
            endDate,
            Math.floor(skip / limit) + 1,
            limit
        );
    }

    private async loadWorkspaceCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const count = await this.analyticWorkspaceRepository.countCreated(
            startDate,
            endDate
        );

        return { count };
    }

    private async loadInviteFunnel(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        return this.analyticWorkspaceRepository.groupInviteFunnel(
            startDate,
            endDate,
            workspaceId
        );
    }

    private async loadJoinOutcomes(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        return this.analyticWorkspaceRepository.groupJoinOutcomes(
            startDate,
            endDate,
            workspaceId
        );
    }

    private async loadMemberRoles(
        workspaceId: string
    ): Promise<IAnalyticRoleCount[]> {
        return this.analyticWorkspaceRepository.groupMemberRoles(workspaceId);
    }

    async getWorkspaceCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.workspaceCreation,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadWorkspaceCreation(startDate, endDate)
        );
    }

    async getWorkspaceInviteFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.workspaceInviteFunnel,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticStatusCountsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.analyticWorkspaceRepository.groupInviteFunnel(
                    startDate,
                    endDate,
                    null
                )
        );
    }

    async getWorkspaceJoinOutcomes(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.workspaceJoinOutcomes,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticStatusCountsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.analyticWorkspaceRepository.groupJoinOutcomes(
                    startDate,
                    endDate,
                    null
                )
        );
    }

    async computeWorkspaceMembership(): Promise<
        IAnalyticSnapshotResult<IAnalyticWorkspaceCount, null>
    > {
        const items = await this.analyticWorkspaceRepository.findMembership();

        return { items, metadata: null, windowStart: null, windowEnd: null };
    }

    async getWorkspaceMembershipList(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return this.analyticSnapshotService.getListOffset(
            EnumAnalyticSnapshotSignal.workspaceMembership,
            params,
            null,
            AnalyticWorkspaceMembershipSnapshotDataSchema
        );
    }

    async getWorkspaceActivityVolumeList(
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const key = this.dashboardPageKey(
            EnumAnalyticDashboardMetric.workspaceActivityVolume,
            startDate,
            endDate,
            params.skip,
            params.limit
        );

        return this.cacheService.readThrough<
            IResponsePaginationReturn<IAnalyticWorkspaceCount>,
            IResponsePaginationReturn<IAnalyticWorkspaceCount>
        >(
            key,
            AnalyticWorkspaceCountPageCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.analyticWorkspaceRepository.groupActivityVolume(
                    startDate,
                    endDate,
                    [...ActivityLogWorkspaceVolumeContract],
                    params
                )
        );
    }

    async getSummary(
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticWorkspaceSummary> {
        const key = this.analyticCache.buildWorkspaceSummaryKey(
            workspaceId,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticWorkspaceSummaryCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.analyticWorkspaceRepository.findSummary(
                    workspaceId,
                    startDate,
                    endDate,
                    [...ActivityLogWorkspaceVolumeContract]
                )
        );
    }

    async getInviteFunnel(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        const key = this.analyticCache.buildWorkspaceInviteFunnelKey(
            workspaceId,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticStatusCountsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadInviteFunnel(workspaceId, startDate, endDate)
        );
    }

    async getJoinOutcomes(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        const key = this.analyticCache.buildWorkspaceJoinOutcomesKey(
            workspaceId,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticStatusCountsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadJoinOutcomes(workspaceId, startDate, endDate)
        );
    }

    async getMemberRoles(workspaceId: string): Promise<IAnalyticRoleCount[]> {
        const key =
            this.analyticCache.buildWorkspaceMemberRolesKey(workspaceId);

        return this.cacheService.readThrough(
            key,
            AnalyticRoleCountsCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadMemberRoles(workspaceId)
        );
    }
}

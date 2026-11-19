import { CacheService } from '@common/cache/services/cache.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogWorkspaceVolumeContract } from '@modules/activity-log/contracts/activity-log.workspace-volume.contract';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticBucketsResultCacheSchema,
    AnalyticMetricCountCacheSchema,
    AnalyticStatusCountsCacheSchema,
    AnalyticWorkspaceCountPageCacheSchema,
    AnalyticWorkspaceSummaryCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticBucketsResult,
    IAnalyticMetricCount,
    IAnalyticRoleCount,
    IAnalyticStatusCount,
    IAnalyticWorkspaceCount,
    IAnalyticWorkspaceSummary,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticWorkspaceRepository } from '@modules/analytic/repositories/analytic.workspace.repository';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticWorkspaceService {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticWorkspaceRepository: AnalyticWorkspaceRepository
    ) {}

    private dashboardKey(
        metric: EnumAnalyticDashboardMetric,
        startDate: Date | null,
        endDate: Date | null
    ): string {
        const start = this.analyticDateUtil.cacheToken(startDate);
        const end = this.analyticDateUtil.cacheToken(endDate);

        return this.analyticCache.buildDashboardKey(metric, start, end);
    }

    private dashboardPageKey(
        metric: EnumAnalyticDashboardMetric,
        startDate: Date | null,
        endDate: Date | null,
        skip: number,
        limit: number
    ): string {
        const start = this.analyticDateUtil.cacheToken(startDate);
        const end = this.analyticDateUtil.cacheToken(endDate);

        return this.analyticCache.buildDashboardPageKey(
            metric,
            start,
            end,
            Math.floor(skip / limit) + 1,
            limit
        );
    }

    async workspacesCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.workspacesCreation,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.analyticWorkspaceRepository.countCreated(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async workspacesVisibility(): Promise<IAnalyticBucketsResult> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.workspacesVisibility,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const buckets =
                    await this.analyticWorkspaceRepository.groupVisibility();

                return { buckets };
            }
        );
    }

    async workspacesInviteFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.workspacesInviteFunnel,
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

    async workspacesJoinOutcomes(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.workspacesJoinOutcomes,
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

    async workspacesMembership(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const key = this.dashboardPageKey(
            EnumAnalyticDashboardMetric.workspacesMembership,
            null,
            null,
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
            () => this.analyticWorkspaceRepository.groupMembership(params)
        );
    }

    async workspacesActivityVolume(
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const key = this.dashboardPageKey(
            EnumAnalyticDashboardMetric.workspacesActivity,
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
            () =>
                this.analyticWorkspaceRepository.findSummary(
                    workspaceId,
                    startDate,
                    endDate,
                    [...ActivityLogWorkspaceVolumeContract]
                )
        );
    }

    async inviteFunnel(
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

    async joinOutcomes(
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

    async memberRoles(workspaceId: string): Promise<IAnalyticRoleCount[]> {
        return this.analyticWorkspaceRepository.groupMemberRoles(workspaceId);
    }

    async activity(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const count = await this.analyticWorkspaceRepository.countActivity(
            workspaceId,
            startDate,
            endDate,
            [...ActivityLogWorkspaceVolumeContract]
        );

        return { count };
    }
}

import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticCacheEmptyToken } from '@modules/analytic/constants/analytic.constant';
import {
    AnalyticDeviceProliferationAvailableOrderBy,
    AnalyticImpossibleTravelAvailableOrderBy,
    AnalyticLoginSpikeIpAvailableOrderBy,
    AnalyticLoginTimeAnomalyAvailableOrderBy,
} from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { EnumAnalyticAnomalySignal } from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticAnomalyDeviceProliferationSummary,
    IAnalyticAnomalyFailedLoginSpikeSummary,
    IAnalyticAnomalyImpossibleTravelSummary,
    IAnalyticAnomalyLoginSpikeIpSummary,
    IAnalyticAnomalySummary,
    IAnalyticDeviceProliferation,
    IAnalyticImpossibleTravel,
    IAnalyticLoginSpikeIp,
    IAnalyticLoginTimeAnomaly,
    IAnalyticNearLockout,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticAnomalyUtil } from '@modules/analytic/utils/analytic.anomaly.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { DeviceAnalyticService } from '@modules/device/services/device.analytic.service';
import { SessionAnalyticService } from '@modules/session/services/session.analytic.service';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { UserAnalyticService } from '@modules/user/services/user.analytic.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@generated/prisma-client/client';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticAnomalyService {
    private readonly impossibleTravelMinDistanceKm: number;
    private readonly impossibleTravelMaxDeltaInMs: number;
    private readonly loginSpikeIpMinUniqueAccounts: number;
    private readonly loginSpikeIpWindowInMs: number;
    private readonly loginTimeAnomalyHistoricalFrequencyPercent: number;
    private readonly loginTimeAnomalyHistoryLimit: number;
    private readonly loginTimeAnomalyMinSample: number;
    private readonly loginTimeAnomalyLookbackInMs: number;
    private readonly concurrency: number;
    private readonly nearLockoutMinAttempt: number;
    private readonly deviceProliferationZScoreThreshold: number;

    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly analyticDateService: AnalyticDateService,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticAnomalyUtil: AnalyticAnomalyUtil,
        private readonly analyticSortUtil: AnalyticSortUtil,
        private readonly analyticFraudUtil: AnalyticFraudUtil,
        private readonly paginationOffsetUtil: PaginationOffsetUtil,
        private readonly configService: ConfigService,
        private readonly helperArrayService: HelperArrayService,
        private readonly helperDateService: HelperDateService,
        private readonly sessionAnalyticService: SessionAnalyticService,
        private readonly userAnalyticService: UserAnalyticService,
        private readonly activityLogAnalyticService: ActivityLogAnalyticService,
        private readonly deviceAnalyticService: DeviceAnalyticService
    ) {
        this.impossibleTravelMinDistanceKm = this.configService.get<number>(
            'analytic.anomaly.impossibleTravel.minDistanceKm'
        )!;
        this.impossibleTravelMaxDeltaInMs = this.configService.get<number>(
            'analytic.anomaly.impossibleTravel.maxDeltaInMs'
        )!;
        this.loginSpikeIpMinUniqueAccounts = this.configService.get<number>(
            'analytic.anomaly.loginSpikeIp.minUniqueAccounts'
        )!;
        this.loginSpikeIpWindowInMs = this.configService.get<number>(
            'analytic.anomaly.loginSpikeIp.windowInMs'
        )!;
        this.loginTimeAnomalyHistoricalFrequencyPercent =
            this.configService.get<number>(
                'analytic.anomaly.loginTimeAnomaly.historicalFrequencyPercent'
            )!;
        this.loginTimeAnomalyHistoryLimit = this.configService.get<number>(
            'analytic.anomaly.loginTimeAnomaly.historyLimit'
        )!;
        this.loginTimeAnomalyMinSample = this.configService.get<number>(
            'analytic.anomaly.minSample'
        )!;
        this.loginTimeAnomalyLookbackInMs = this.configService.get<number>(
            'analytic.anomaly.lookbackInMs'
        )!;
        this.concurrency = this.configService.get<number>(
            'analytic.anomaly.concurrency'
        )!;
        const passwordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        this.nearLockoutMinAttempt =
            this.analyticFraudUtil.nearLockoutThreshold(passwordMaxAttempt);
        this.deviceProliferationZScoreThreshold =
            this.configService.get<number>(
                'analytic.anomaly.deviceProliferation.zScoreThreshold'
            )!;
    }

    private async computeImpossibleTravel(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticImpossibleTravel[]> {
        const now = this.helperDateService.create();
        const sessions =
            await this.sessionAnalyticService.getActiveWithGeoInRange(
                startDate,
                endDate,
                now
            );

        return this.analyticAnomalyUtil.findImpossibleTravel(
            sessions,
            this.impossibleTravelMinDistanceKm,
            this.impossibleTravelMaxDeltaInMs
        );
    }

    private async computeLoginSpikeIp(
        windowMs: number
    ): Promise<IAnalyticLoginSpikeIp[]> {
        const { startDate, endDate } =
            this.analyticDateUtil.windowRange(windowMs);
        const pairs =
            await this.activityLogAnalyticService.getGroupIpUserByActions(
                UserLoginAnalyticActions,
                startDate,
                endDate
            );
        const groups = this.analyticAnomalyUtil.groupByIp(pairs);

        return [...groups.entries()]
            .filter(
                ([, group]) =>
                    group.users.size >= this.loginSpikeIpMinUniqueAccounts
            )
            .map(([ipAddress, group]) => ({
                ipAddress,
                uniqueUsers: group.users.size,
                attempts: group.count,
            }))
            .sort((a, b) => b.uniqueUsers - a.uniqueUsers);
    }

    private async computeLoginTimeAnomalies(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticLoginTimeAnomaly[]> {
        const now = this.helperDateService.create();
        const end = endDate ?? now;
        const defaultStart = this.helperDateService.backward(
            end,
            Duration.fromMillis(this.loginTimeAnomalyLookbackInMs)
        );
        const start = startDate ?? defaultStart;
        const users =
            await this.activityLogAnalyticService.getGroupUserByActions(
                UserLoginAnalyticActions,
                start,
                end,
                this.loginTimeAnomalyMinSample
            );
        const anomalous: IAnalyticLoginTimeAnomaly[] = [];
        const batches = this.helperArrayService.chunk(users, this.concurrency);
        for (const batch of batches) {
            // Sequential by design: bounded chunks, concurrent within a chunk
            const historyPromises = batch.map(user =>
                this.activityLogAnalyticService.getCreatedAtByUserActionsInRange(
                    user.userId,
                    UserLoginAnalyticActions,
                    start,
                    end,
                    this.loginTimeAnomalyHistoryLimit
                )
            );
            const historyPerUser = await Promise.all(historyPromises);
            for (const [index, user] of batch.entries()) {
                const anomaly = this.analyticAnomalyUtil.findLoginTimeAnomaly(
                    user.userId,
                    historyPerUser[index]!,
                    this.loginTimeAnomalyHistoricalFrequencyPercent
                );
                if (anomaly) {
                    anomalous.push(anomaly);
                }
            }
        }

        return anomalous;
    }

    async getImpossibleTravelUserIds(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<string[]> {
        const rows = await this.computeImpossibleTravel(startDate, endDate);
        return [...new Set(rows.map(row => row.userId))];
    }

    async impossibleTravelSummary(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticAnomalyImpossibleTravelSummary> {
        const window = this.analyticDateUtil.windowToken(startDate, endDate);
        const cached =
            await this.analyticCache.getAnomalySummary<IAnalyticAnomalyImpossibleTravelSummary>(
                EnumAnalyticAnomalySignal.impossibleTravel,
                window
            );
        if (cached) {
            return cached;
        }

        const rows = await this.computeImpossibleTravel(startDate, endDate);
        const summary: IAnalyticAnomalyImpossibleTravelSummary = {
            count: rows.length,
            window,
            meta: {
                minDistanceKm: this.impossibleTravelMinDistanceKm,
                maxDeltaInMs: this.impossibleTravelMaxDeltaInMs,
            },
        };
        await this.analyticCache.setAnomalySummary(
            EnumAnalyticAnomalySignal.impossibleTravel,
            window,
            summary
        );
        return summary;
    }

    async impossibleTravelList(
        startDate: Date | null,
        endDate: Date | null,
        params: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticImpossibleTravel>> {
        const rows = await this.computeImpossibleTravel(startDate, endDate);
        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticImpossibleTravelAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async loginSpikeIpSummary(
        windowMs: number | null
    ): Promise<IAnalyticAnomalyLoginSpikeIpSummary> {
        const window = this.analyticDateService.resolveWindow(
            windowMs,
            this.loginSpikeIpWindowInMs
        );
        const cached =
            await this.analyticCache.getAnomalySummary<IAnalyticAnomalyLoginSpikeIpSummary>(
                EnumAnalyticAnomalySignal.loginSpikeIp,
                String(window)
            );
        if (cached) {
            return cached;
        }

        const rows = await this.computeLoginSpikeIp(window);
        const summary: IAnalyticAnomalyLoginSpikeIpSummary = {
            count: rows.length,
            window: String(window),
            meta: {
                minUniqueAccounts: this.loginSpikeIpMinUniqueAccounts,
            },
        };
        await this.analyticCache.setAnomalySummary(
            EnumAnalyticAnomalySignal.loginSpikeIp,
            String(window),
            summary
        );
        return summary;
    }

    async loginSpikeIpList(
        windowMs: number | null,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticLoginSpikeIp>> {
        const window = this.analyticDateService.resolveWindow(
            windowMs,
            this.loginSpikeIpWindowInMs
        );
        const rows = await this.computeLoginSpikeIp(window);
        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticLoginSpikeIpAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async failedLoginSpikeSummary(): Promise<IAnalyticAnomalyFailedLoginSpikeSummary> {
        const cached =
            await this.analyticCache.getAnomalySummary<IAnalyticAnomalyFailedLoginSpikeSummary>(
                EnumAnalyticAnomalySignal.failedLoginSpike,
                AnalyticCacheEmptyToken
            );
        if (cached) {
            return cached;
        }

        const [buckets, nearCount] = await Promise.all([
            this.userAnalyticService.getGroupPasswordAttemptBuckets(),
            this.userAnalyticService.getCountNearLockout(
                this.nearLockoutMinAttempt
            ),
        ]);
        const summary: IAnalyticAnomalyFailedLoginSpikeSummary = {
            count: nearCount,
            window: null,
            meta: {
                nearLockoutMinAttempt: this.nearLockoutMinAttempt,
                bucketCount: buckets.length,
            },
        };
        await this.analyticCache.setAnomalySummary(
            EnumAnalyticAnomalySignal.failedLoginSpike,
            AnalyticCacheEmptyToken,
            summary
        );
        return summary;
    }

    async failedLoginSpikeList(
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>> {
        return this.userAnalyticService.getListNearLockoutOffset(
            this.nearLockoutMinAttempt,
            params
        );
    }

    async deviceProliferationSummary(): Promise<IAnalyticAnomalyDeviceProliferationSummary> {
        const cached =
            await this.analyticCache.getAnomalySummary<IAnalyticAnomalyDeviceProliferationSummary>(
                EnumAnalyticAnomalySignal.deviceProliferation,
                AnalyticCacheEmptyToken
            );
        if (cached) {
            return cached;
        }

        const result =
            await this.deviceAnalyticService.getProliferationOutliers(
                this.deviceProliferationZScoreThreshold
            );
        const summary: IAnalyticAnomalyDeviceProliferationSummary = {
            count: result.count,
            window: null,
            meta: {
                avg: result.avg,
                stdDev: result.stdDev,
                zScoreThreshold: this.deviceProliferationZScoreThreshold,
            },
        };
        await this.analyticCache.setAnomalySummary(
            EnumAnalyticAnomalySignal.deviceProliferation,
            AnalyticCacheEmptyToken,
            summary
        );
        return summary;
    }

    async deviceProliferationList(
        params: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticDeviceProliferation>> {
        const result =
            await this.deviceAnalyticService.getProliferationOutliers(
                this.deviceProliferationZScoreThreshold
            );
        const { data, total } = this.analyticSortUtil.sortPage(
            result.rows,
            params,
            AnalyticDeviceProliferationAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }

    async loginTimeSummary(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticAnomalySummary> {
        const window = this.analyticDateUtil.windowToken(startDate, endDate);
        const cached =
            await this.analyticCache.getAnomalySummary<IAnalyticAnomalySummary>(
                EnumAnalyticAnomalySignal.loginTime,
                window
            );
        if (cached) {
            return cached;
        }

        const rows = await this.computeLoginTimeAnomalies(startDate, endDate);
        const summary: IAnalyticAnomalySummary = {
            count: rows.length,
            window,
        };
        await this.analyticCache.setAnomalySummary(
            EnumAnalyticAnomalySignal.loginTime,
            window,
            summary
        );
        return summary;
    }

    async loginTimeList(
        startDate: Date | null,
        endDate: Date | null,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticLoginTimeAnomaly>> {
        const rows = await this.computeLoginTimeAnomalies(startDate, endDate);
        const { data, total } = this.analyticSortUtil.sortPage(
            rows,
            params,
            AnalyticLoginTimeAnomalyAvailableOrderBy
        );

        return this.paginationOffsetUtil.page(data, total, {
            skip: params.skip,
            limit: params.limit,
        });
    }
}

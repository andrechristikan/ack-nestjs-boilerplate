import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticActiveUsers,
    IAnalyticBlockedUsers,
    IAnalyticBucketsResult,
    IAnalyticMetricCount,
    IAnalyticMetricRate,
    IAnalyticVerifiedGroupCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticUserRepository } from '@modules/analytic/repositories/analytic.user.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import { AnalyticActiveUsersCacheSchema } from '@modules/analytic/dtos/analytic.active-users-cache.dto';
import { AnalyticBlockedUsersCacheSchema } from '@modules/analytic/dtos/analytic.blocked-users-cache.dto';
import { AnalyticBucketsResultCacheSchema } from '@modules/analytic/dtos/analytic.buckets-result-cache.dto';
import { AnalyticMetricCountCacheSchema } from '@modules/analytic/dtos/analytic.metric-count-cache.dto';
import { AnalyticMetricRateCacheSchema } from '@modules/analytic/dtos/analytic.metric-rate-cache.dto';

@Injectable()
export class AnalyticUserService {
    private readonly dailyInMs: number;
    private readonly weeklyInMs: number;
    private readonly monthlyInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService,
        private readonly analyticUserRepository: AnalyticUserRepository
    ) {
        this.dailyInMs = this.configService.get<number>(
            'analytic.user.active.dailyInMs'
        )!;
        this.weeklyInMs = this.configService.get<number>(
            'analytic.user.active.weeklyInMs'
        )!;
        this.monthlyInMs = this.configService.get<number>(
            'analytic.user.active.monthlyInMs'
        )!;
    }

    private toVerificationRate(
        rows: IAnalyticVerifiedGroupCount[]
    ): IAnalyticMetricRate {
        const verified = rows
            .filter(row => row.isVerified)
            .reduce((sum, row) => sum + row.count, 0);
        const total = rows.reduce((sum, row) => sum + row.count, 0);

        const rate = this.helperNumberService.percent(verified, total);

        return { count: verified, total, rate };
    }

    private async loadUserActive(): Promise<IAnalyticActiveUsers> {
        const now = this.helperDateService.now();
        const dailySince = this.helperDateService.backward(
            now,
            Duration.fromMillis(this.dailyInMs)
        );
        const weeklySince = this.helperDateService.backward(
            now,
            Duration.fromMillis(this.weeklyInMs)
        );
        const monthlySince = this.helperDateService.backward(
            now,
            Duration.fromMillis(this.monthlyInMs)
        );
        const counts = await this.analyticUserRepository.findActiveCounts(
            dailySince,
            weeklySince,
            monthlySince
        );

        return { ...counts, windowEnd: now, computedAt: null };
    }

    private async loadUserRegistrations(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const count = await this.analyticUserRepository.countRegistrations(
            startDate,
            endDate
        );

        return { count };
    }

    private async loadUserChurn(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricRate> {
        const { deleted, total } =
            await this.analyticUserRepository.findChurnCounts(
                startDate,
                endDate
            );

        const rate = this.helperNumberService.percent(deleted, total);

        return { count: deleted, total, rate };
    }

    private async loadUserSignUpWith(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const buckets = await this.analyticUserRepository.groupSignUpWith(
            startDate,
            endDate
        );

        return { buckets };
    }

    private async loadUserEmailVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticMetricRate> {
        const rows = await this.analyticUserRepository.groupEmailVerification(
            startDate,
            endDate
        );

        return this.toVerificationRate(rows);
    }

    private async loadUserStatusDistribution(): Promise<IAnalyticBucketsResult> {
        const buckets = await this.analyticUserRepository.groupStatus();

        return { buckets };
    }

    private async loadUserCountryDistribution(): Promise<IAnalyticBucketsResult> {
        const buckets = await this.analyticUserRepository.groupCountry();

        return { buckets };
    }

    private async loadUserRoleDistribution(): Promise<IAnalyticBucketsResult> {
        const buckets = await this.analyticUserRepository.groupRole();

        return { buckets };
    }

    async getUserActive(): Promise<IAnalyticActiveUsers> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.userActive,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticActiveUsersCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadUserActive()
        );
    }

    async getUserRegistrations(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.userRegistrations,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadUserRegistrations(startDate, endDate)
        );
    }

    async getUserChurn(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricRate> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.userChurn,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadUserChurn(startDate, endDate)
        );
    }

    async getUserBlocked(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBlockedUsers> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.userBlocked,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBlockedUsersCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.analyticUserRepository.findBlockedCounts(
                    startDate,
                    endDate
                )
        );
    }

    async getUserSignUpWith(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.userSignUpWith,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadUserSignUpWith(startDate, endDate)
        );
    }

    async getUserEmailVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticMetricRate> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.userEmailVerification,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadUserEmailVerification(startDate, endDate)
        );
    }

    async getUserStatusDistribution(): Promise<IAnalyticBucketsResult> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.userStatusDistribution,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadUserStatusDistribution()
        );
    }

    async getUserCountryDistribution(): Promise<IAnalyticBucketsResult> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.userCountryDistribution,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadUserCountryDistribution()
        );
    }

    async getUserRoleDistribution(): Promise<IAnalyticBucketsResult> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.userRoleDistribution,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadUserRoleDistribution()
        );
    }
}

import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticActiveUsersCacheSchema,
    AnalyticBlockedUsersCacheSchema,
    AnalyticBucketsResultCacheSchema,
    AnalyticMetricCountCacheSchema,
    AnalyticMetricRateCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
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
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticUserService {
    private readonly dailyInMs: number;
    private readonly weeklyInMs: number;
    private readonly monthlyInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticDateUtil: AnalyticDateUtil,
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

    private dashboardKey(
        metric: EnumAnalyticDashboardMetric,
        startDate: Date | null,
        endDate: Date | null
    ): string {
        const start = this.analyticDateUtil.cacheToken(startDate);
        const end = this.analyticDateUtil.cacheToken(endDate);

        return this.analyticCache.buildDashboardKey(metric, start, end);
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

    async usersActive(): Promise<IAnalyticActiveUsers> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersActive,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticActiveUsersCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const now = this.helperDateService.create();
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
                const counts =
                    await this.analyticUserRepository.findActiveCounts(
                        dailySince,
                        weeklySince,
                        monthlySince
                    );

                return { ...counts, windowEnd: now, computedAt: null };
            }
        );
    }

    async usersRegistrations(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersRegistrations,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.analyticUserRepository.countRegistrations(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async usersChurn(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricRate> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersChurn,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const { deleted, total } =
                    await this.analyticUserRepository.findChurnCounts(
                        startDate,
                        endDate
                    );

                const rate = this.helperNumberService.percent(deleted, total);

                return { count: deleted, total, rate };
            }
        );
    }

    async usersBlocked(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBlockedUsers> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersBlocked,
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

    async usersSignUpWith(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersSignUpWith,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const buckets =
                    await this.analyticUserRepository.groupSignUpWith(
                        startDate,
                        endDate
                    );

                return { buckets };
            }
        );
    }

    async usersEmailVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticMetricRate> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersEmailVerification,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows =
                    await this.analyticUserRepository.groupEmailVerification(
                        startDate,
                        endDate
                    );

                return this.toVerificationRate(rows);
            }
        );
    }

    async usersStatusDistribution(): Promise<IAnalyticBucketsResult> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersStatus,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const buckets = await this.analyticUserRepository.groupStatus();

                return { buckets };
            }
        );
    }

    async usersCountryDistribution(): Promise<IAnalyticBucketsResult> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersCountry,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const buckets =
                    await this.analyticUserRepository.groupCountry();

                return { buckets };
            }
        );
    }

    async usersRoleDistribution(): Promise<IAnalyticBucketsResult> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersRole,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const buckets = await this.analyticUserRepository.groupRole();

                return { buckets };
            }
        );
    }
}

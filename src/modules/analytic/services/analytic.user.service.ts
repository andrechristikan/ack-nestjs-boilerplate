import { CacheService } from '@common/cache/services/cache.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticBlockedUsersCacheSchema,
    AnalyticBucketsResultCacheSchema,
    AnalyticMetricCountCacheSchema,
    AnalyticMetricRateCacheSchema,
    AnalyticMobileChurnCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticBlockedUsers,
    IAnalyticBucketsResult,
    IAnalyticMetricCount,
    IAnalyticMetricRate,
    IAnalyticMobileChurn,
    IAnalyticVerifiedGroupCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticUserRepository } from '@modules/analytic/repositories/analytic.user.repository';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticUserService {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly helperNumberService: HelperNumberService,
        private readonly analyticUserRepository: AnalyticUserRepository
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

    async usersSignUpFrom(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersSignUpFrom,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const buckets =
                    await this.analyticUserRepository.groupSignUpFrom(
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

    async usersMobileVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticMetricRate> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersMobileVerification,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows =
                    await this.analyticUserRepository.groupMobileVerification(
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

    async usersSelfDelete(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersSelfDelete,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.analyticUserRepository.countActivityByActions(
                        [EnumActivityLogAction.userDeleteSelf],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async usersClaimUsername(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersClaimUsername,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMetricCountCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const count =
                    await this.analyticUserRepository.countActivityByActions(
                        [EnumActivityLogAction.userClaimUsername],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    async usersMobileChurn(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMobileChurn> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.usersMobileChurn,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticMobileChurnCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows =
                    await this.analyticUserRepository.groupActivityByAction(
                        [
                            EnumActivityLogAction.userAddMobileNumber,
                            EnumActivityLogAction.userUpdateMobileNumber,
                            EnumActivityLogAction.userDeleteMobileNumber,
                        ],
                        startDate,
                        endDate
                    );
                const countOf = (action: EnumActivityLogAction): number =>
                    rows.find(row => row.action === action)?.count ?? 0;

                return {
                    added: countOf(EnumActivityLogAction.userAddMobileNumber),
                    updated: countOf(
                        EnumActivityLogAction.userUpdateMobileNumber
                    ),
                    deleted: countOf(
                        EnumActivityLogAction.userDeleteMobileNumber
                    ),
                };
            }
        );
    }
}

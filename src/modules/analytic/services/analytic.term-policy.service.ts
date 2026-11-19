import { CacheService } from '@common/cache/services/cache.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticTermPolicyAcceptanceRateCacheSchema,
    AnalyticTermPolicyTimeToAcceptCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticTermPolicyTimeToAccept,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticTermPolicyRepository } from '@modules/analytic/repositories/analytic.term-policy.repository';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticTermPolicyService {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly helperNumberService: HelperNumberService,
        private readonly analyticTermPolicyRepository: AnalyticTermPolicyRepository
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

    async termPoliciesAcceptanceRate(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceRate> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.termPoliciesAcceptance,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticTermPolicyAcceptanceRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const { published, acceptances, users } =
                    await this.analyticTermPolicyRepository.findAcceptanceCounts(
                        TermPolicyDefaultRequiredTypes,
                        startDate,
                        endDate
                    );
                const rate = this.helperNumberService.percent(
                    acceptances,
                    users * published
                );

                return { acceptances, users, published, rate };
            }
        );
    }

    async termPoliciesTimeToAccept(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticTermPolicyTimeToAccept> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.termPoliciesTimeToAccept,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticTermPolicyTimeToAcceptCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const { count, averageMs } =
                    await this.analyticTermPolicyRepository.findTimeToAccept(
                        startDate,
                        endDate
                    );

                return { count, averageMs: averageMs ?? 0 };
            }
        );
    }
}

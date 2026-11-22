import { CacheService } from '@common/cache/services/cache.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticTermPolicyAcceptanceRate } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticTermPolicyRepository } from '@modules/analytic/repositories/analytic.term-policy.repository';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import { Injectable } from '@nestjs/common';
import { AnalyticTermPolicyAcceptanceRateCacheSchema } from '@modules/analytic/dtos/analytic.term-policy-acceptance-rate-cache.dto';

@Injectable()
export class AnalyticTermPolicyService {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly helperNumberService: HelperNumberService,
        private readonly analyticTermPolicyRepository: AnalyticTermPolicyRepository
    ) {}

    private async loadTermPolicyAcceptanceRate(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceRate> {
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

    async getTermPolicyAcceptanceRate(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceRate> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.termPolicyAcceptanceRate,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticTermPolicyAcceptanceRateCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadTermPolicyAcceptanceRate(startDate, endDate)
        );
    }
}

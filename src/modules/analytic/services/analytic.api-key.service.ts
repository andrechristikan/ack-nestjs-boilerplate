import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticApiKeyActiveExpiredCacheSchema } from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticApiKeyActiveExpired } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticApiKeyRepository } from '@modules/analytic/repositories/analytic.api-key.repository';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticApiKeyService {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly helperDateService: HelperDateService,
        private readonly analyticApiKeyRepository: AnalyticApiKeyRepository
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

    async apiKeysActiveExpired(): Promise<IAnalyticApiKeyActiveExpired> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.apiKeysActiveExpired,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticApiKeyActiveExpiredCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const now = this.helperDateService.create();

                return this.analyticApiKeyRepository.findActiveExpired(now);
            }
        );
    }
}

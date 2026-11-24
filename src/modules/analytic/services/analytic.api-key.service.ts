import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticApiKeyActiveExpired } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticApiKeyRepository } from '@modules/analytic/repositories/analytic.api-key.repository';
import { Injectable } from '@nestjs/common';
import { AnalyticApiKeyActiveExpiredCacheSchema } from '@modules/analytic/dtos/analytic.api-key-active-expired-cache.dto';

@Injectable()
export class AnalyticApiKeyService {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly helperDateService: HelperDateService,
        private readonly analyticApiKeyRepository: AnalyticApiKeyRepository
    ) {}

    private async loadApiKeyActiveExpired(): Promise<IAnalyticApiKeyActiveExpired> {
        const now = this.helperDateService.now();

        return this.analyticApiKeyRepository.findActiveExpired(now);
    }

    async getApiKeyActiveExpired(): Promise<IAnalyticApiKeyActiveExpired> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.apiKeyActiveExpired,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticApiKeyActiveExpiredCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadApiKeyActiveExpired()
        );
    }
}

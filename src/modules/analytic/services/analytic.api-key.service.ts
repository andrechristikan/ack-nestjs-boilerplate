import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticApiKeyActiveExpiredCacheSchema,
    AnalyticApiKeyLifecycleCacheSchema,
    AnalyticBucketsResultCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticApiKeyActiveExpired,
    IAnalyticApiKeyLifecycle,
    IAnalyticBucketsResult,
} from '@modules/analytic/interfaces/analytic.interface';
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

    async apiKeysLifecycle(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticApiKeyLifecycle> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.apiKeysLifecycle,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticApiKeyLifecycleCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const rows = await this.analyticApiKeyRepository.groupLifecycle(
                    startDate,
                    endDate
                );
                const countOf = (action: EnumActivityLogAction): number =>
                    rows.find(row => row.action === action)?.count ?? 0;

                return {
                    created: countOf(EnumActivityLogAction.adminApiKeyCreate),
                    reset: countOf(EnumActivityLogAction.adminApiKeyReset),
                    updated:
                        countOf(EnumActivityLogAction.adminApiKeyUpdate) +
                        countOf(EnumActivityLogAction.adminApiKeyUpdateDate) +
                        countOf(EnumActivityLogAction.adminApiKeyUpdateStatus),
                    deleted: countOf(EnumActivityLogAction.adminApiKeyDelete),
                };
            }
        );
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

    async apiKeysTypeMix(): Promise<IAnalyticBucketsResult> {
        const key = this.dashboardKey(
            EnumAnalyticDashboardMetric.apiKeysTypeMix,
            null,
            null
        );

        return this.cacheService.readThrough(
            key,
            AnalyticBucketsResultCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const buckets = await this.analyticApiKeyRepository.groupType();

                return { buckets };
            }
        );
    }
}

import { CacheService } from '@common/cache/services/cache.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticNotificationDeliveryCacheSchema } from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticNotificationDeliveryResult } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticNotificationRepository } from '@modules/analytic/repositories/analytic.notification.repository';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticNotificationService {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticNotificationRepository: AnalyticNotificationRepository
    ) {}

    async notificationsDelivery(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticNotificationDeliveryResult> {
        const start = this.analyticDateUtil.cacheToken(startDate);
        const end = this.analyticDateUtil.cacheToken(endDate);
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.notificationsDelivery,
            start,
            end
        );

        return this.cacheService.readThrough(
            key,
            AnalyticNotificationDeliveryCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            async () => {
                const channels =
                    await this.analyticNotificationRepository.groupDelivery(
                        startDate,
                        endDate
                    );

                return { channels };
            }
        );
    }
}

import { CacheService } from '@common/cache/services/cache.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticNotificationDeliveryResult } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticNotificationRepository } from '@modules/analytic/repositories/analytic.notification.repository';
import { Injectable } from '@nestjs/common';
import { AnalyticNotificationDeliveryCacheSchema } from '@modules/analytic/dtos/analytic.notification-delivery-cache.dto';

@Injectable()
export class AnalyticNotificationService {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticNotificationRepository: AnalyticNotificationRepository
    ) {}

    private async loadNotificationDelivery(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticNotificationDeliveryResult> {
        const channels =
            await this.analyticNotificationRepository.groupDelivery(
                startDate,
                endDate
            );

        return { channels };
    }

    async getNotificationDelivery(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticNotificationDeliveryResult> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.notificationDelivery,
            startDate,
            endDate
        );

        return this.cacheService.readThrough(
            key,
            AnalyticNotificationDeliveryCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () => this.loadNotificationDelivery(startDate, endDate)
        );
    }
}

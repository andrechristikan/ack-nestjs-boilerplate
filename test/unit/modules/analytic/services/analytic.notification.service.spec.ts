import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { CacheService } from '@common/cache/services/cache.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { AnalyticNotificationRepository } from '@modules/analytic/repositories/analytic.notification.repository';
import { AnalyticNotificationService } from '@modules/analytic/services/analytic.notification.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticNotificationDeliveryCacheSchema } from '@modules/analytic/dtos/analytic.notification-delivery-cache.dto';

describe('AnalyticNotificationService', () => {
    const dashboardTtlInMs = 1800000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        dashboardTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticNotificationRepository: MockProxy<AnalyticNotificationRepository> =
        mock<AnalyticNotificationRepository>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-01-08T00:00:00.000Z');
    const startToken = '2026-01-01T00:00:00.000Z';
    const endToken = '2026-01-08T00:00:00.000Z';

    let service: AnalyticNotificationService;

    beforeEach(async () => {
        analyticCache.buildDashboardKey.mockImplementation(
            (metric, start, end) =>
                `${metric}:${start?.toISOString() ?? '_'}:${end?.toISOString() ?? '_'}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticNotificationService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                    }),
                },
                {
                    provide: AnalyticNotificationRepository,
                    useValue: analyticNotificationRepository,
                },
            ],
        }).compile();

        service = module.get(AnalyticNotificationService);
    });

    describe('getNotificationDelivery', () => {
        it('reads through the dashboard key and returns the repository rows under channels', async () => {
            const rows = [
                {
                    channel: EnumNotificationChannel.email,
                    total: 6,
                    sent: 3,
                    failed: 2,
                    pending: 1,
                },
            ];
            analyticNotificationRepository.groupDelivery.mockResolvedValue(
                rows
            );

            const result = await service.getNotificationDelivery(
                startDate,
                endDate
            );

            expect(result).toEqual({ channels: rows });
            expect(analyticCache.buildDashboardKey).toHaveBeenCalledWith(
                EnumAnalyticDashboardMetric.notificationDelivery,
                startDate,
                endDate
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.notificationDelivery}:${startToken}:${endToken}`,
                AnalyticNotificationDeliveryCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
            expect(
                analyticNotificationRepository.groupDelivery
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('answers an empty channels list when the repository finds no row', async () => {
            analyticNotificationRepository.groupDelivery.mockResolvedValue([]);

            const result = await service.getNotificationDelivery(
                startDate,
                endDate
            );

            expect(result).toEqual({ channels: [] });
        });
    });
});

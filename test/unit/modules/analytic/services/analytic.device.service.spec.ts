import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { Duration } from 'luxon';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import {
    AnalyticBucketsResultCacheSchema,
    AnalyticDevicesPerUserSnapshotDataSchema,
    AnalyticMetricCountCacheSchema,
    AnalyticMetricRateCacheSchema,
    AnalyticSessionDeviceRatioCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { AnalyticDeviceRepository } from '@modules/analytic/repositories/analytic.device.repository';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('AnalyticDeviceService', () => {
    const dashboardTtlInMs = 1800000;
    const deviceInactivityInMs = 2592000000;
    const idleTimeoutInMs = 604800000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        dashboardTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const analyticBucketUtil: MockProxy<AnalyticBucketUtil> =
        mock<AnalyticBucketUtil>();
    const analyticSnapshotService: MockProxy<AnalyticSnapshotService> =
        mock<AnalyticSnapshotService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();
    const analyticDeviceRepository: MockProxy<AnalyticDeviceRepository> =
        mock<AnalyticDeviceRepository>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const startToken = '2026-01-01T00:00:00.000Z';
    const endToken = '2026-02-01T00:00:00.000Z';
    const now: Date = new Date('2026-03-01T00:00:00.000Z');
    const before: Date = new Date('2026-01-30T00:00:00.000Z');
    const buckets = [{ key: 'a', count: 7 }];

    let configService: MockProxy<ConfigService>;
    let service: AnalyticDeviceService;

    beforeEach(async () => {
        vi.resetAllMocks();

        configService = buildConfigService({
            'analytic.device.inactivityInMs': deviceInactivityInMs,
            'session.idleTimeoutInMs': idleTimeoutInMs,
        });
        analyticDateUtil.cacheToken.mockImplementation((date: Date | null) =>
            date ? date.toISOString() : '_'
        );
        analyticCache.buildDashboardKey.mockImplementation(
            (metric, start, end) => `${metric}:${start}:${end}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );

        helperDateService.create.mockReturnValue(now);
        helperDateService.backward.mockReturnValue(before);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDeviceService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                { provide: ConfigService, useValue: configService },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                { provide: AnalyticBucketUtil, useValue: analyticBucketUtil },
                {
                    provide: AnalyticSnapshotService,
                    useValue: analyticSnapshotService,
                },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperNumberService, useValue: helperNumberService },
                {
                    provide: AnalyticDeviceRepository,
                    useValue: analyticDeviceRepository,
                },
            ],
        }).compile();

        service = module.get(AnalyticDeviceService);
    });

    describe('devicesPushToken', () => {
        it('answers the share of live ownerships holding a token from one repository call', async () => {
            analyticDeviceRepository.countPushToken.mockResolvedValue({
                total: 4,
                withToken: 3,
            });
            helperNumberService.percent.mockReturnValue(75);

            const result = await service.devicesPushToken();

            expect(result).toEqual({ count: 3, total: 4, rate: 75 });
            expect(
                analyticDeviceRepository.countPushToken
            ).toHaveBeenCalledTimes(1);
            expect(helperNumberService.percent).toHaveBeenCalledWith(3, 4);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesPushToken}:_:_`,
                AnalyticMetricRateCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });

        it('answers 100 when every ownership holds a token', async () => {
            analyticDeviceRepository.countPushToken.mockResolvedValue({
                total: 5,
                withToken: 5,
            });
            helperNumberService.percent.mockReturnValue(100);

            const result = await service.devicesPushToken();

            expect(result).toEqual({ count: 5, total: 5, rate: 100 });
            expect(helperNumberService.percent).toHaveBeenCalledWith(5, 5);
        });
    });

    describe('devicesRegistration', () => {
        it('wraps the registration count read through the dashboard cache', async () => {
            analyticDeviceRepository.countRegistrations.mockResolvedValue(6);

            const result = await service.devicesRegistration(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 6 });
            expect(
                analyticDeviceRepository.countRegistrations
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesRegistration}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('devicesPlatform', () => {
        it('wraps the platform groups as buckets', async () => {
            analyticDeviceRepository.groupPlatform.mockResolvedValue(buckets);

            const result = await service.devicesPlatform();

            expect(result).toEqual({ buckets });
            expect(
                analyticDeviceRepository.groupPlatform
            ).toHaveBeenCalledTimes(1);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesPlatform}:_:_`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('devicesInfoRefresh', () => {
        it('wraps the refresh count read through the dashboard cache', async () => {
            analyticDeviceRepository.countInfoRefresh.mockResolvedValue(9);

            const result = await service.devicesInfoRefresh(startDate, endDate);

            expect(result).toEqual({ count: 9 });
            expect(
                analyticDeviceRepository.countInfoRefresh
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesInfoRefresh}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('devicesSessionRatio', () => {
        it('divides sessions by devices from one repository call', async () => {
            analyticDeviceRepository.findSessionRatioCounts.mockResolvedValue({
                sessions: 6,
                devices: 4,
            });

            const result = await service.devicesSessionRatio();

            expect(result).toEqual({ sessions: 6, devices: 4, ratio: 1.5 });
            expect(
                analyticDeviceRepository.findSessionRatioCounts
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticDeviceRepository.findSessionRatioCounts
            ).toHaveBeenCalledWith(now, before);
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                Duration.fromMillis(idleTimeoutInMs)
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesSessionRatio}:_:_`,
                AnalyticSessionDeviceRatioCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });

        it('answers a zero ratio when no device exists', async () => {
            analyticDeviceRepository.findSessionRatioCounts.mockResolvedValue({
                sessions: 3,
                devices: 0,
            });

            const result = await service.devicesSessionRatio();

            expect(result).toEqual({ sessions: 3, devices: 0, ratio: 0 });
        });
    });

    describe('computeDevicesPerUser', () => {
        it('passes the repository buckets to the snapshot util with no bucketing', async () => {
            const snapshot = {
                items: [],
                metadata: null,
                windowStart: null,
                windowEnd: null,
            };
            analyticDeviceRepository.groupPerUser.mockResolvedValue(buckets);
            analyticBucketUtil.toBucketSnapshot.mockReturnValue(snapshot);

            const result = await service.computeDevicesPerUser();

            expect(result).toBe(snapshot);
            expect(analyticDeviceRepository.groupPerUser).toHaveBeenCalledTimes(
                1
            );
            expect(analyticBucketUtil.toBucketSnapshot).toHaveBeenCalledWith(
                buckets
            );
        });
    });

    describe('devicesPerUser', () => {
        it('reads the stored buckets through the snapshot service with no cache', async () => {
            const stored = { buckets, computedAt: now };
            analyticSnapshotService.getBuckets.mockResolvedValue(stored);

            const result = await service.devicesPerUser();

            expect(result).toBe(stored);
            expect(analyticSnapshotService.getBuckets).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.devicesPerUser,
                AnalyticDevicesPerUserSnapshotDataSchema
            );
            expect(cacheService.readThrough).not.toHaveBeenCalled();
        });
    });

    describe('devicesInactivity', () => {
        it('counts ownerships idle since the configured inactivity window', async () => {
            analyticDeviceRepository.countInactive.mockResolvedValue(2);

            const result = await service.devicesInactivity();

            expect(result).toEqual({ count: 2 });
            expect(analyticDeviceRepository.countInactive).toHaveBeenCalledWith(
                before
            );
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                Duration.fromMillis(deviceInactivityInMs)
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesInactivity}:_:_`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });
});

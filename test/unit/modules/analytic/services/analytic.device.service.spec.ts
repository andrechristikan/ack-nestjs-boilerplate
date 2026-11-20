import { CacheService } from '@common/cache/services/cache.service';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import {
    AnalyticBucketsResultCacheSchema,
    AnalyticDevicesPerUserSnapshotDataSchema,
    AnalyticMetricCountCacheSchema,
    AnalyticMetricRateCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { AnalyticDeviceRepository } from '@modules/analytic/repositories/analytic.device.repository';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('AnalyticDeviceService', () => {
    const dashboardTtlInMs = 1800000;
    const deviceInactivityInMs = 2592000000;
    const idleTimeoutInMs = 604800000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        dashboardTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticSnapshotService: MockProxy<AnalyticSnapshotService> =
        mock<AnalyticSnapshotService>();
    const analyticDeviceRepository: MockProxy<AnalyticDeviceRepository> =
        mock<AnalyticDeviceRepository>();

    const now: Date = new Date('2026-03-01T00:00:00.000Z');
    const before: Date = new Date('2026-01-30T00:00:00.000Z');
    const buckets = [{ key: 'a', count: 7 }];

    let configService: MockProxy<ConfigService>;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    let service: AnalyticDeviceService;

    beforeEach(async () => {
        configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'analytic.cache.windowTokenPattern': 'Window:{start}:{end}',
            'analytic.device.inactivityInMs': deviceInactivityInMs,
            'session.idleTimeoutInMs': idleTimeoutInMs,
        });
        analyticCache.buildDashboardKey.mockImplementation(
            (metric, start, end) => `${metric}:${start}:${end}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDeviceService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                { provide: ConfigService, useValue: configService },
                ...TestUnitKitProviders,
                AnalyticDateUtil,
                AnalyticBucketUtil,
                {
                    provide: AnalyticSnapshotService,
                    useValue: analyticSnapshotService,
                },
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

            const result = await service.devicesPushToken();

            expect(result).toEqual({ count: 3, total: 4, rate: 75 });
            expect(
                analyticDeviceRepository.countPushToken
            ).toHaveBeenCalledTimes(1);
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

            const result = await service.devicesPushToken();

            expect(result).toEqual({ count: 5, total: 5, rate: 100 });
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

    describe('computeDevicesPerUser', () => {
        it('passes the repository buckets to the snapshot util with no bucketing', async () => {
            const snapshot = {
                items: [
                    {
                        key: 'a',
                        value: 0,
                        occurredAt: null,
                        data: { key: 'a', count: 7 },
                    },
                ],
                metadata: null,
                windowStart: null,
                windowEnd: null,
            };
            analyticDeviceRepository.groupPerUser.mockResolvedValue(buckets);

            const result = await service.computeDevicesPerUser();

            expect(result).toEqual(snapshot);
            expect(analyticDeviceRepository.groupPerUser).toHaveBeenCalledTimes(
                1
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
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesInactivity}:_:_`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });
});

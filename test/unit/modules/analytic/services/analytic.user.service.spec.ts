import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { CacheService } from '@common/cache/services/cache.service';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticActiveUsersCacheSchema,
    AnalyticBlockedUsersCacheSchema,
    AnalyticBucketsResultCacheSchema,
    AnalyticMetricCountCacheSchema,
    AnalyticMetricRateCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { AnalyticUserRepository } from '@modules/analytic/repositories/analytic.user.repository';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('AnalyticUserService', () => {
    const dashboardTtlInMs = 1800000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        dashboardTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticUserRepository: MockProxy<AnalyticUserRepository> =
        mock<AnalyticUserRepository>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const startToken = '2026-01-01T00:00:00.000Z';
    const endToken = '2026-02-01T00:00:00.000Z';
    const buckets = [{ key: 'a', count: 7 }];

    const dailyInMs = 86400000;
    const weeklyInMs = 604800000;
    const monthlyInMs = 2592000000;
    const now: Date = new Date('2026-11-19T10:00:00.000Z');

    let configService: MockProxy<ConfigService>;
    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-19T10:00:00.000Z'));
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    let service: AnalyticUserService;

    beforeEach(async () => {
        configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'analytic.cache.windowTokenPattern': 'Window:{start}:{end}',
            'analytic.user.active.dailyInMs': dailyInMs,
            'analytic.user.active.weeklyInMs': weeklyInMs,
            'analytic.user.active.monthlyInMs': monthlyInMs,
        });
        analyticCache.buildDashboardKey.mockImplementation(
            (metric, start, end) => `${metric}:${start}:${end}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticUserService,
                ...TestUnitKitProviders,
                { provide: ConfigService, useValue: configService },
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                AnalyticDateUtil,
                {
                    provide: AnalyticUserRepository,
                    useValue: analyticUserRepository,
                },
            ],
        }).compile();

        service = module.get(AnalyticUserService);
    });

    describe('usersActive', () => {
        it('reads the three windows back from now through the dashboard cache', async () => {
            analyticUserRepository.findActiveCounts.mockResolvedValue({
                daily: 2,
                weekly: 5,
                monthly: 9,
            });

            const result = await service.usersActive();

            expect(result).toEqual({
                daily: 2,
                weekly: 5,
                monthly: 9,
                windowEnd: now,
                computedAt: null,
            });
            expect(
                analyticUserRepository.findActiveCounts
            ).toHaveBeenCalledWith(
                new Date('2026-11-18T10:00:00.000Z'),
                new Date('2026-11-12T10:00:00.000Z'),
                new Date('2026-10-20T10:00:00.000Z')
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersActive}:_:_`,
                AnalyticActiveUsersCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersRegistrations', () => {
        it('wraps the registration count read through the dashboard cache', async () => {
            analyticUserRepository.countRegistrations.mockResolvedValue(12);

            const result = await service.usersRegistrations(startDate, endDate);

            expect(result).toEqual({ count: 12 });
            expect(
                analyticUserRepository.countRegistrations
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersRegistrations}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersChurn', () => {
        it('answers the deleted share of the users alive at the start', async () => {
            analyticUserRepository.findChurnCounts.mockResolvedValue({
                deleted: 4,
                total: 10,
            });

            const result = await service.usersChurn(startDate, endDate);

            expect(result).toEqual({ count: 4, total: 10, rate: 40 });
            expect(
                analyticUserRepository.findChurnCounts
            ).toHaveBeenCalledTimes(1);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersChurn}:${startToken}:${endToken}`,
                AnalyticMetricRateCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersBlocked', () => {
        it('returns the blocked trend and the standing count from one read', async () => {
            analyticUserRepository.findBlockedCounts.mockResolvedValue({
                trend: 3,
                current: 5,
            });

            const result = await service.usersBlocked(startDate, endDate);

            expect(result).toEqual({ trend: 3, current: 5 });
            expect(
                analyticUserRepository.findBlockedCounts
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersBlocked}:${startToken}:${endToken}`,
                AnalyticBlockedUsersCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersSignUpWith', () => {
        it('wraps the sign-up-with groups as buckets', async () => {
            analyticUserRepository.groupSignUpWith.mockResolvedValue(buckets);

            const result = await service.usersSignUpWith(startDate, endDate);

            expect(result).toEqual({ buckets });
            expect(analyticUserRepository.groupSignUpWith).toHaveBeenCalledWith(
                startDate,
                endDate
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersSignUpWith}:${startToken}:${endToken}`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersEmailVerification', () => {
        it('answers verified 3 of total 4 from two group rows', async () => {
            analyticUserRepository.groupEmailVerification.mockResolvedValue([
                { isVerified: true, count: 3 },
                { isVerified: false, count: 1 },
            ]);

            const result = await service.usersEmailVerification(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 3, total: 4, rate: 75 });
            expect(
                analyticUserRepository.groupEmailVerification
            ).toHaveBeenCalledTimes(1);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersEmailVerification}:${startToken}:${endToken}`,
                AnalyticMetricRateCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });

        it('answers zero verified when only unverified rows exist', async () => {
            analyticUserRepository.groupEmailVerification.mockResolvedValue([
                { isVerified: false, count: 2 },
            ]);

            const result = await service.usersEmailVerification(null, null);

            expect(result).toEqual({ count: 0, total: 2, rate: 0 });
        });
    });

    describe('usersStatusDistribution', () => {
        it('wraps the status groups as buckets', async () => {
            analyticUserRepository.groupStatus.mockResolvedValue(buckets);

            const result = await service.usersStatusDistribution();

            expect(result).toEqual({ buckets });
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersStatus}:_:_`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersCountryDistribution', () => {
        it('wraps the country groups as buckets', async () => {
            analyticUserRepository.groupCountry.mockResolvedValue(buckets);

            const result = await service.usersCountryDistribution();

            expect(result).toEqual({ buckets });
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersCountry}:_:_`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersRoleDistribution', () => {
        it('wraps the role groups as buckets', async () => {
            analyticUserRepository.groupRole.mockResolvedValue(buckets);

            const result = await service.usersRoleDistribution();

            expect(result).toEqual({ buckets });
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersRole}:_:_`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });
});

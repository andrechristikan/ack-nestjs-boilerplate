import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Duration } from 'luxon';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticGeoUtil } from '@modules/analytic/utils/analytic.geo.util';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserLoginAnalyticDomain } from '@modules/user/domains/user.login.analytic.domain';

describe('AnalyticAnomalyDomain', () => {
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const analyticGeoUtil: MockProxy<AnalyticGeoUtil> = mock<AnalyticGeoUtil>();
    const paginationService: MockProxy<PaginationService> =
        mock<PaginationService>();
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const sessionAnalyticDomain: MockProxy<SessionAnalyticDomain> =
        mock<SessionAnalyticDomain>();
    const userAnalyticDomain: MockProxy<UserAnalyticDomain> =
        mock<UserAnalyticDomain>();
    const userLoginAnalyticDomain: MockProxy<UserLoginAnalyticDomain> =
        mock<UserLoginAnalyticDomain>();
    const deviceAnalyticDomain: MockProxy<DeviceAnalyticDomain> =
        mock<DeviceAnalyticDomain>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const now: Date = new Date('2026-03-01T00:00:00.000Z');
    const pagination = { skip: 0, limit: 20, orderBy: [] };
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 0,
        perPage: 20,
        page: 1,
        totalPage: 0,
        hasNext: false,
        hasPrevious: false,
        data: [],
    };
    const emptyAgent: UserAgent = {
        ua: null,
        browser: null,
        cpu: { architecture: null },
        device: { type: null, vendor: null, model: null },
        engine: { name: null, version: null },
        os: { name: null, version: null },
    };
    const nyc: GeoLocation = {
        latitude: 40.7,
        longitude: -74,
        country: 'US',
        region: 'NY',
        city: 'New York',
    };
    const london: GeoLocation = {
        latitude: 51.5,
        longitude: -0.1,
        country: 'GB',
        region: 'ENG',
        city: 'London',
    };

    let domain: AnalyticAnomalyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, number> = {
                'analytic.anomaly.impossibleTravel.minDistanceKm': 500,
                'analytic.anomaly.impossibleTravel.maxDeltaInMs': 3600000,
                'analytic.anomaly.loginSpikeIp.minUniqueAccounts': 2,
                'analytic.anomaly.loginSpikeIp.windowInMs': 3600000,
                'analytic.anomaly.loginTimeAnomaly.historicalFrequencyPercent': 20,
                'auth.password.maxAttempt': 5,
                'analytic.anomaly.failedLoginSpike.nearLockoutOffset': 1,
                'analytic.anomaly.deviceProliferation.zScoreThreshold': 3,
            };
            return values[key];
        });
        analyticCache.getAnomalySummary.mockResolvedValue(null);
        analyticDateUtil.windowToken.mockReturnValue('window-token');
        helperDateService.create.mockReturnValue(now);
        helperDateService.backward.mockReturnValue(startDate);
        paginationService.offsetPage.mockReturnValue(offsetPage);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAnomalyDomain,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                { provide: AnalyticGeoUtil, useValue: analyticGeoUtil },
                { provide: PaginationService, useValue: paginationService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: SessionAnalyticDomain,
                    useValue: sessionAnalyticDomain,
                },
                { provide: UserAnalyticDomain, useValue: userAnalyticDomain },
                {
                    provide: UserLoginAnalyticDomain,
                    useValue: userLoginAnalyticDomain,
                },
                {
                    provide: DeviceAnalyticDomain,
                    useValue: deviceAnalyticDomain,
                },
            ],
        }).compile();

        domain = module.get(AnalyticAnomalyDomain);
    });

    describe('impossibleTravelSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 9, window: 'window-token' };
            analyticCache.getAnomalySummary.mockResolvedValue(cached);

            const result = await domain.impossibleTravelSummary(
                startDate,
                endDate
            );

            expect(result).toEqual(cached);
            expect(
                sessionAnalyticDomain.findActiveWithGeoInRange
            ).not.toHaveBeenCalled();
        });

        it('computes and caches the summary on a cache miss', async () => {
            sessionAnalyticDomain.findActiveWithGeoInRange.mockResolvedValue(
                []
            );

            const result = await domain.impossibleTravelSummary(
                startDate,
                endDate
            );

            expect(result).toEqual({
                count: 0,
                window: 'window-token',
                meta: { minDistanceKm: 500, maxDeltaInMs: 3600000 },
            });
            expect(analyticCache.setAnomalySummary).toHaveBeenCalledWith(
                'impossible-travel',
                'window-token',
                result
            );
        });
    });

    describe('impossibleTravelList', () => {
        it('pages the computed rows through PaginationService.offsetPage', async () => {
            sessionAnalyticDomain.findActiveWithGeoInRange.mockResolvedValue(
                []
            );

            const result = await domain.impossibleTravelList(
                startDate,
                endDate,
                pagination
            );

            expect(result).toEqual(offsetPage);
            expect(paginationService.offsetPage).toHaveBeenCalledWith([], 0, {
                skip: 0,
                limit: 20,
            });
        });
    });

    describe('loginSpikeIpSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 2, window: '3600000' };
            analyticCache.getAnomalySummary.mockResolvedValue(cached);

            const result = await domain.loginSpikeIpSummary(null);

            expect(result).toEqual(cached);
            expect(
                userLoginAnalyticDomain.findLoginEvents
            ).not.toHaveBeenCalled();
        });

        it('uses the configured window when windowMs is omitted', async () => {
            userLoginAnalyticDomain.findLoginEvents.mockResolvedValue([]);

            const result = await domain.loginSpikeIpSummary(null);

            expect(result.window).toBe('3600000');
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                Duration.fromMillis(3600000)
            );
        });

        it('uses the supplied windowMs when present', async () => {
            userLoginAnalyticDomain.findLoginEvents.mockResolvedValue([]);

            const result = await domain.loginSpikeIpSummary(600000);

            expect(result.window).toBe('600000');
            expect(analyticCache.setAnomalySummary).toHaveBeenCalledWith(
                'login-spike-ip',
                '600000',
                result
            );
        });
    });

    describe('loginSpikeIpList', () => {
        it('pages spike rows for the configured window', async () => {
            userLoginAnalyticDomain.findLoginEvents.mockResolvedValue([]);

            const result = await domain.loginSpikeIpList(null, pagination);

            expect(result).toEqual(offsetPage);
            expect(paginationService.offsetPage).toHaveBeenCalledWith([], 0, {
                skip: 0,
                limit: 20,
            });
        });
    });

    describe('failedLoginSpikeSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 1 };
            analyticCache.getAnomalySummary.mockResolvedValue(cached);

            const result = await domain.failedLoginSpikeSummary();

            expect(result).toEqual(cached);
            expect(userAnalyticDomain.findNearLockout).not.toHaveBeenCalled();
        });

        it('caches near-lockout counts with a floor of one attempt', async () => {
            userAnalyticDomain.groupPasswordAttemptBuckets.mockResolvedValue([
                { key: '3', count: 2 },
            ]);
            userAnalyticDomain.findNearLockout.mockResolvedValue([
                {
                    id: 'user-1',
                    email: 'user@example.com',
                    passwordAttempt: 4,
                    lastLoginAt: startDate,
                },
            ]);

            const result = await domain.failedLoginSpikeSummary();

            expect(result).toEqual({
                count: 1,
                meta: { nearLockoutMinAttempt: 4, bucketCount: 1 },
            });
            expect(userAnalyticDomain.findNearLockout).toHaveBeenCalledWith(4);
        });
    });

    describe('failedLoginSpikeList', () => {
        it('lists near-lockout users at maxAttempt minus offset', async () => {
            userAnalyticDomain.listNearLockoutOffset.mockResolvedValue(
                offsetPage
            );

            const result = await domain.failedLoginSpikeList(pagination);

            expect(result).toEqual(offsetPage);
            expect(
                userAnalyticDomain.listNearLockoutOffset
            ).toHaveBeenCalledWith(4, pagination);
        });

        it('floors the near-lockout min attempt at 1', async () => {
            configGet.mockImplementation((key: string) => {
                if (key === 'auth.password.maxAttempt') {
                    return 1;
                }
                if (
                    key ===
                    'analytic.anomaly.failedLoginSpike.nearLockoutOffset'
                ) {
                    return 5;
                }
                return 0;
            });
            userAnalyticDomain.listNearLockoutOffset.mockResolvedValue(
                offsetPage
            );

            await domain.failedLoginSpikeList(pagination);

            expect(
                userAnalyticDomain.listNearLockoutOffset
            ).toHaveBeenCalledWith(1, pagination);
        });
    });

    describe('deviceProliferationSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 2 };
            analyticCache.getAnomalySummary.mockResolvedValue(cached);

            const result = await domain.deviceProliferationSummary();

            expect(result).toEqual(cached);
            expect(
                deviceAnalyticDomain.proliferationOutliers
            ).not.toHaveBeenCalled();
        });

        it('caches outlier statistics on a cache miss', async () => {
            deviceAnalyticDomain.proliferationOutliers.mockResolvedValue({
                count: 1,
                avg: 2,
                stdDev: 0.5,
                rows: [{ userId: 'user-1', deviceCount: 8, zScore: 3.1 }],
            });

            const result = await domain.deviceProliferationSummary();

            expect(result).toEqual({
                count: 1,
                meta: { avg: 2, stdDev: 0.5, zScoreThreshold: 3 },
            });
        });
    });

    describe('deviceProliferationList', () => {
        it('pages outlier rows through PaginationService.offsetPage', async () => {
            const rows = [
                { userId: 'user-1', deviceCount: 8, zScore: 3.1 },
                { userId: 'user-2', deviceCount: 9, zScore: 3.4 },
            ];
            deviceAnalyticDomain.proliferationOutliers.mockResolvedValue({
                count: 2,
                avg: 2,
                stdDev: 0.5,
                rows,
            });

            const result = await domain.deviceProliferationList({
                skip: 1,
                limit: 1,
                orderBy: [],
            });

            expect(result).toEqual(offsetPage);
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [rows[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('loginTimeSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 0, window: 'window-token' };
            analyticCache.getAnomalySummary.mockResolvedValue(cached);

            const result = await domain.loginTimeSummary(startDate, endDate);

            expect(result).toEqual(cached);
        });

        it('computes and caches the summary on a cache miss', async () => {
            userLoginAnalyticDomain.findLoginEvents.mockResolvedValue([]);

            const result = await domain.loginTimeSummary(startDate, endDate);

            expect(result).toEqual({ count: 0, window: 'window-token' });
            expect(analyticCache.setAnomalySummary).toHaveBeenCalledWith(
                'login-time',
                'window-token',
                result
            );
        });
    });

    describe('loginTimeList', () => {
        it('pages login-time anomalies through PaginationService.offsetPage', async () => {
            userLoginAnalyticDomain.findLoginEvents.mockResolvedValue([]);

            const result = await domain.loginTimeList(
                startDate,
                endDate,
                pagination
            );

            expect(result).toEqual(offsetPage);
        });
    });

    describe('windowToken', () => {
        it('stringifies a truthy windowMs', () => {
            expect(domain['windowToken'](null, null, 3600000)).toBe('3600000');
            expect(analyticDateUtil.windowToken).not.toHaveBeenCalled();
        });

        it('falls back to the date-util window token when windowMs is absent', () => {
            expect(domain['windowToken'](startDate, endDate, null)).toBe(
                'window-token'
            );
            expect(analyticDateUtil.windowToken).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });

        it('passes undefined into the date util when dates are null', () => {
            domain['windowToken'](null, null, null);

            expect(analyticDateUtil.windowToken).toHaveBeenCalledWith(
                undefined,
                undefined
            );
        });
    });

    describe('computeImpossibleTravel', () => {
        it('passes undefined into the session lookup when dates are null', async () => {
            sessionAnalyticDomain.findActiveWithGeoInRange.mockResolvedValue(
                []
            );

            await domain['computeImpossibleTravel'](null, null);

            expect(
                sessionAnalyticDomain.findActiveWithGeoInRange
            ).toHaveBeenCalledWith(undefined, undefined);
        });

        it('flags consecutive sessions that travel too far too fast', async () => {
            sessionAnalyticDomain.findActiveWithGeoInRange.mockResolvedValue([
                {
                    id: 'session-1',
                    userId: 'user-1',
                    ipAddress: null,
                    createdAt: startDate,
                    geoLocation: nyc,
                    userAgent: emptyAgent,
                },
                {
                    id: 'session-2',
                    userId: 'user-1',
                    ipAddress: null,
                    createdAt: new Date('2026-01-01T00:10:00.000Z'),
                    geoLocation: london,
                    userAgent: emptyAgent,
                },
            ]);
            analyticGeoUtil.distanceKm.mockReturnValue(800);

            const result = await domain['computeImpossibleTravel'](
                startDate,
                endDate
            );

            expect(result).toEqual([
                {
                    userId: 'user-1',
                    fromSessionId: 'session-1',
                    toSessionId: 'session-2',
                    distanceKm: 800,
                    deltaMs: 600000,
                },
            ]);
        });

        it('skips a pair when either session has no geo, distance is short, or delta is slow', async () => {
            sessionAnalyticDomain.findActiveWithGeoInRange.mockResolvedValue([
                {
                    id: 'solo',
                    userId: 'user-solo',
                    ipAddress: null,
                    createdAt: startDate,
                    geoLocation: nyc,
                    userAgent: emptyAgent,
                },
                {
                    id: 'a1',
                    userId: 'user-a',
                    ipAddress: null,
                    createdAt: startDate,
                    geoLocation: null,
                    userAgent: emptyAgent,
                },
                {
                    id: 'a2',
                    userId: 'user-a',
                    ipAddress: null,
                    createdAt: new Date('2026-01-01T00:10:00.000Z'),
                    geoLocation: london,
                    userAgent: emptyAgent,
                },
                {
                    id: 'b1',
                    userId: 'user-b',
                    ipAddress: null,
                    createdAt: startDate,
                    geoLocation: nyc,
                    userAgent: emptyAgent,
                },
                {
                    id: 'b2',
                    userId: 'user-b',
                    ipAddress: null,
                    createdAt: new Date('2026-01-01T00:10:00.000Z'),
                    geoLocation: null,
                    userAgent: emptyAgent,
                },
                {
                    id: 'c1',
                    userId: 'user-c',
                    ipAddress: null,
                    createdAt: startDate,
                    geoLocation: nyc,
                    userAgent: emptyAgent,
                },
                {
                    id: 'c2',
                    userId: 'user-c',
                    ipAddress: null,
                    createdAt: new Date('2026-01-01T00:10:00.000Z'),
                    geoLocation: london,
                    userAgent: emptyAgent,
                },
                {
                    id: 'd1',
                    userId: 'user-d',
                    ipAddress: null,
                    createdAt: startDate,
                    geoLocation: nyc,
                    userAgent: emptyAgent,
                },
                {
                    id: 'd2',
                    userId: 'user-d',
                    ipAddress: null,
                    createdAt: new Date('2026-01-02T00:00:00.000Z'),
                    geoLocation: london,
                    userAgent: emptyAgent,
                },
            ]);
            analyticGeoUtil.distanceKm
                .mockReturnValueOnce(100)
                .mockReturnValueOnce(800);

            const result = await domain['computeImpossibleTravel'](
                startDate,
                endDate
            );

            expect(result).toEqual([]);
        });
    });

    describe('computeLoginSpikeIp', () => {
        it('groups unique users per ip, treats a missing ip as unknown, and sorts by unique users', async () => {
            userLoginAnalyticDomain.findLoginEvents.mockResolvedValue([
                {
                    id: 'e1',
                    userId: 'user-1',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: '10.0.0.1',
                    createdAt: startDate,
                },
                {
                    id: 'e2',
                    userId: 'user-2',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: '10.0.0.1',
                    createdAt: startDate,
                },
                {
                    id: 'e3',
                    userId: 'user-3',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: null,
                    createdAt: startDate,
                },
                {
                    id: 'e4',
                    userId: 'user-4',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: null,
                    createdAt: startDate,
                },
                {
                    id: 'e5',
                    userId: 'user-5',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: null,
                    createdAt: startDate,
                },
                {
                    id: 'e6',
                    userId: 'user-6',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: '10.0.0.2',
                    createdAt: startDate,
                },
            ]);

            const result = await domain['computeLoginSpikeIp'](3600000);

            expect(result).toEqual([
                { ipAddress: 'unknown', uniqueUsers: 3, attempts: 3 },
                { ipAddress: '10.0.0.1', uniqueUsers: 2, attempts: 2 },
            ]);
        });
    });

    describe('computeLoginTimeAnomalies', () => {
        it('uses now and a 30-day lookback when dates are omitted', async () => {
            const defaultStart = new Date('2026-01-30T00:00:00.000Z');
            helperDateService.backward.mockReturnValue(defaultStart);
            userLoginAnalyticDomain.findLoginEvents.mockResolvedValue([]);

            await domain['computeLoginTimeAnomalies'](null, null);

            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                Duration.fromObject({ days: 30 })
            );
            expect(
                userLoginAnalyticDomain.findLoginEvents
            ).toHaveBeenCalledWith(defaultStart, now);
        });

        it('skips users with fewer than five logins and flags a rare last hour', async () => {
            const hours = [8, 8, 8, 8, 8, 3];
            userLoginAnalyticDomain.findLoginEvents.mockResolvedValue(
                hours.map((hour, index) => ({
                    id: `e${index}`,
                    userId: 'user-1',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: '10.0.0.1',
                    createdAt: new Date(Date.UTC(2026, 0, 1, hour, 0, 0)),
                }))
            );

            const result = await domain['computeLoginTimeAnomalies'](
                startDate,
                endDate
            );

            expect(result).toEqual([
                {
                    userId: 'user-1',
                    lastHour: 3,
                    historicalFrequencyPercent: (1 / 6) * 100,
                },
            ]);
        });

        it('does not flag a last hour at or above the frequency threshold', async () => {
            const hours = [8, 8, 8, 8, 8];
            userLoginAnalyticDomain.findLoginEvents.mockResolvedValue([
                ...hours.map((hour, index) => ({
                    id: `keep-${index}`,
                    userId: 'user-keep',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: '10.0.0.1',
                    createdAt: new Date(Date.UTC(2026, 0, 1, hour, 0, 0)),
                })),
                {
                    id: 'short',
                    userId: 'user-short',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: '10.0.0.1',
                    createdAt: startDate,
                },
            ]);

            const result = await domain['computeLoginTimeAnomalies'](
                startDate,
                endDate
            );

            expect(result).toEqual([]);
        });
    });
});

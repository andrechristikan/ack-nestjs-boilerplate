import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Duration } from 'luxon';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticDeviceProliferationAvailableOrderBy,
    AnalyticImpossibleTravelAvailableOrderBy,
    AnalyticLoginSpikeIpAvailableOrderBy,
    AnalyticLoginTimeAnomalyAvailableOrderBy,
} from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticAnomalyUtil } from '@modules/analytic/utils/analytic.anomaly.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { createAnalyticAnomalyDomain } from '@test/unit/helpers/test.unit.analytic.helper';
import type { IAnalyticAnomalyDomainDoubles } from '@test/unit/helpers/test.unit.analytic.helper';

describe('AnalyticAnomalyDomain', () => {
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>();
    const analyticDateDomain: MockProxy<AnalyticDateDomain> =
        mock<AnalyticDateDomain>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const analyticAnomalyUtil: MockProxy<AnalyticAnomalyUtil> =
        mock<AnalyticAnomalyUtil>();
    const analyticSortUtil: MockProxy<AnalyticSortUtil> =
        mock<AnalyticSortUtil>();
    const analyticFraudUtil: MockProxy<AnalyticFraudUtil> =
        mock<AnalyticFraudUtil>();
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
    const activityLogAnalyticDomain: MockProxy<ActivityLogAnalyticDomain> =
        mock<ActivityLogAnalyticDomain>();
    const deviceAnalyticDomain: MockProxy<DeviceAnalyticDomain> =
        mock<DeviceAnalyticDomain>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const now: Date = new Date('2026-03-01T00:00:00.000Z');
    const pagination = { skip: 0, limit: 20, orderBy: [] };
    const orderBy: IPaginationOrderBy[] = [
        { userId: EnumPaginationOrderDirectionType.asc },
    ];
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

    const doubles: IAnalyticAnomalyDomainDoubles = {
        analyticCache,
        analyticDateDomain,
        analyticDateUtil,
        analyticAnomalyUtil,
        analyticSortUtil,
        analyticFraudUtil,
        paginationService,
        configService,
        helperDateService,
        sessionAnalyticDomain,
        userAnalyticDomain,
        activityLogAnalyticDomain,
        deviceAnalyticDomain,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, number> = {
                'analytic.anomaly.impossibleTravel.minDistanceKm': 500,
                'analytic.anomaly.impossibleTravel.maxDeltaInMs': 3600000,
                'analytic.anomaly.loginSpikeIp.minUniqueAccounts': 2,
                'analytic.anomaly.loginSpikeIp.windowInMs': 3600000,
                'analytic.anomaly.loginTimeAnomaly.historicalFrequencyPercent': 20,
                'analytic.anomaly.minSample': 5,
                'analytic.anomaly.lookbackInMs': 2592000000,
                'auth.password.maxAttempt': 5,
                'analytic.anomaly.deviceProliferation.zScoreThreshold': 3,
            };
            return values[key];
        });
        analyticFraudUtil.nearLockoutThreshold.mockReturnValue(4);
        analyticCache.getAnomalySummary.mockResolvedValue(null);
        analyticDateDomain.resolveWindow.mockImplementation(
            (windowMs, defaultInMs) => windowMs ?? defaultInMs
        );
        analyticDateUtil.windowToken.mockReturnValue('window-token');
        analyticDateUtil.windowRange.mockReturnValue({
            startDate,
            endDate: now,
        });
        helperDateService.create.mockReturnValue(now);
        helperDateService.backward.mockReturnValue(startDate);
        analyticAnomalyUtil.findImpossibleTravel.mockReturnValue([]);
        analyticAnomalyUtil.groupByIp.mockReturnValue(new Map());
        analyticAnomalyUtil.findLoginTimeAnomalies.mockReturnValue([]);
        analyticSortUtil.sortPage.mockReturnValue({ data: [], total: 0 });
        paginationService.offsetPage.mockReturnValue(offsetPage);

        domain = await createAnalyticAnomalyDomain(doubles);
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
                sessionAnalyticDomain.getActiveWithGeoInRange
            ).not.toHaveBeenCalled();
        });

        it('computes and caches the summary on a cache miss', async () => {
            sessionAnalyticDomain.getActiveWithGeoInRange.mockResolvedValue([]);

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
            sessionAnalyticDomain.getActiveWithGeoInRange.mockResolvedValue([]);

            const result = await domain.impossibleTravelList(
                startDate,
                endDate,
                pagination
            );

            expect(result).toEqual(offsetPage);
            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                pagination,
                AnalyticImpossibleTravelAvailableOrderBy
            );
            expect(paginationService.offsetPage).toHaveBeenCalledWith([], 0, {
                skip: 0,
                limit: 20,
            });
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            sessionAnalyticDomain.getActiveWithGeoInRange.mockResolvedValue([]);
            const sorted = [
                {
                    userId: 'user-1',
                    fromSessionId: 'session-1',
                    toSessionId: 'session-2',
                    distanceKm: 900,
                    deltaMs: 1000,
                },
                {
                    userId: 'user-2',
                    fromSessionId: 'session-3',
                    toSessionId: 'session-4',
                    distanceKm: 700,
                    deltaMs: 2000,
                },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await domain.impossibleTravelList(startDate, endDate, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticImpossibleTravelAvailableOrderBy
            );
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('loginSpikeIpSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 2, window: '3600000' };
            analyticCache.getAnomalySummary.mockResolvedValue(cached);

            const result = await domain.loginSpikeIpSummary(null);

            expect(result).toEqual(cached);
            expect(
                activityLogAnalyticDomain.getManyByActionsInRange
            ).not.toHaveBeenCalled();
        });

        it('uses the configured window when windowMs is omitted', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.loginSpikeIpSummary(null);

            expect(result.window).toBe('3600000');
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(3600000);
            expect(
                activityLogAnalyticDomain.getManyByActionsInRange
            ).toHaveBeenCalledWith(UserLoginAnalyticActions, startDate, now);
        });

        it('uses the supplied windowMs when present', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.loginSpikeIpSummary(600000);

            expect(result.window).toBe('600000');
            expect(analyticDateDomain.resolveWindow).toHaveBeenCalledWith(
                600000,
                3600000
            );
            expect(analyticCache.setAnomalySummary).toHaveBeenCalledWith(
                'login-spike-ip',
                '600000',
                result
            );
        });
    });

    describe('loginSpikeIpList', () => {
        it('pages spike rows for the configured window', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.loginSpikeIpList(null, pagination);

            expect(result).toEqual(offsetPage);
            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                pagination,
                AnalyticLoginSpikeIpAvailableOrderBy
            );
            expect(paginationService.offsetPage).toHaveBeenCalledWith([], 0, {
                skip: 0,
                limit: 20,
            });
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );
            const sorted = [
                { ipAddress: '10.0.0.1', uniqueUsers: 4, attempts: 9 },
                { ipAddress: '10.0.0.2', uniqueUsers: 2, attempts: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await domain.loginSpikeIpList(null, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticLoginSpikeIpAvailableOrderBy
            );
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('failedLoginSpikeSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 1, window: null };
            analyticCache.getAnomalySummary.mockResolvedValue(cached);

            const result = await domain.failedLoginSpikeSummary();

            expect(result).toEqual(cached);
            expect(
                userAnalyticDomain.getCountNearLockout
            ).not.toHaveBeenCalled();
        });

        it('caches the near-lockout count with a floor of one attempt', async () => {
            userAnalyticDomain.getGroupPasswordAttemptBuckets.mockResolvedValue(
                [{ key: '3', count: 2 }]
            );
            userAnalyticDomain.getCountNearLockout.mockResolvedValue(1);

            const result = await domain.failedLoginSpikeSummary();

            expect(result).toEqual({
                count: 1,
                window: null,
                meta: { nearLockoutMinAttempt: 4, bucketCount: 1 },
            });
            expect(userAnalyticDomain.getCountNearLockout).toHaveBeenCalledWith(
                4
            );
        });
    });

    describe('failedLoginSpikeList', () => {
        it('lists near-lockout users at maxAttempt minus offset', async () => {
            userAnalyticDomain.getListNearLockoutOffset.mockResolvedValue(
                offsetPage
            );

            const result = await domain.failedLoginSpikeList(pagination);

            expect(result).toEqual(offsetPage);
            expect(
                userAnalyticDomain.getListNearLockoutOffset
            ).toHaveBeenCalledWith(4, pagination);
        });

        it('takes the near-lockout min attempt from the fraud util for the password max attempt', async () => {
            analyticFraudUtil.nearLockoutThreshold.mockReturnValue(1);
            domain = await createAnalyticAnomalyDomain(doubles);
            userAnalyticDomain.getListNearLockoutOffset.mockResolvedValue(
                offsetPage
            );

            await domain.failedLoginSpikeList(pagination);

            expect(analyticFraudUtil.nearLockoutThreshold).toHaveBeenCalledWith(
                5
            );
            expect(
                userAnalyticDomain.getListNearLockoutOffset
            ).toHaveBeenCalledWith(1, pagination);
        });
    });

    describe('deviceProliferationSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 2, window: null };
            analyticCache.getAnomalySummary.mockResolvedValue(cached);

            const result = await domain.deviceProliferationSummary();

            expect(result).toEqual(cached);
            expect(
                deviceAnalyticDomain.getProliferationOutliers
            ).not.toHaveBeenCalled();
        });

        it('caches outlier statistics on a cache miss', async () => {
            deviceAnalyticDomain.getProliferationOutliers.mockResolvedValue({
                count: 1,
                avg: 2,
                stdDev: 0.5,
                rows: [{ userId: 'user-1', deviceCount: 8, zScore: 3.1 }],
            });

            const result = await domain.deviceProliferationSummary();

            expect(result).toEqual({
                count: 1,
                window: null,
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
            deviceAnalyticDomain.getProliferationOutliers.mockResolvedValue({
                count: 2,
                avg: 2,
                stdDev: 0.5,
                rows,
            });
            analyticSortUtil.sortPage.mockReturnValue({
                data: [rows[1]!],
                total: 2,
            });

            const result = await domain.deviceProliferationList({
                skip: 1,
                limit: 1,
                orderBy: [],
            });

            expect(result).toEqual(offsetPage);
            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                rows,
                {
                    skip: 1,
                    limit: 1,
                    orderBy: [],
                },
                AnalyticDeviceProliferationAvailableOrderBy
            );
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [rows[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            const rows = [
                { userId: 'user-1', deviceCount: 8, zScore: 3.1 },
                { userId: 'user-2', deviceCount: 9, zScore: 3.4 },
            ];
            deviceAnalyticDomain.getProliferationOutliers.mockResolvedValue({
                count: 2,
                avg: 2,
                stdDev: 0.5,
                rows,
            });
            analyticSortUtil.sortPage.mockReturnValue({
                data: [rows[1]!],
                total: 2,
            });

            await domain.deviceProliferationList({
                skip: 0,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                rows,
                {
                    skip: 0,
                    limit: 1,
                    orderBy,
                },
                AnalyticDeviceProliferationAvailableOrderBy
            );
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [rows[1]],
                2,
                { skip: 0, limit: 1 }
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
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

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
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            const result = await domain.loginTimeList(
                startDate,
                endDate,
                pagination
            );

            expect(result).toEqual(offsetPage);
            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                pagination,
                AnalyticLoginTimeAnomalyAvailableOrderBy
            );
            expect(paginationService.offsetPage).toHaveBeenCalledWith([], 0, {
                skip: 0,
                limit: 20,
            });
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );
            const sorted = [
                {
                    userId: 'user-1',
                    lastHour: 3,
                    historicalFrequencyPercent: 5,
                },
                {
                    userId: 'user-2',
                    lastHour: 4,
                    historicalFrequencyPercent: 1,
                },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await domain.loginTimeList(startDate, endDate, {
                skip: 1,
                limit: 1,
                orderBy,
            });

            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                {
                    skip: 1,
                    limit: 1,
                    orderBy,
                },
                AnalyticLoginTimeAnomalyAvailableOrderBy
            );
            expect(paginationService.offsetPage).toHaveBeenCalledWith(
                [sorted[1]],
                2,
                { skip: 1, limit: 1 }
            );
        });
    });

    describe('getImpossibleTravelUserIds', () => {
        it('returns the distinct users with an impossible-travel pair', async () => {
            const sessions = [
                {
                    id: 'session-1',
                    userId: 'user-1',
                    ipAddress: null,
                    createdAt: startDate,
                    geoLocation: nyc,
                    userAgent: emptyAgent,
                },
            ];
            sessionAnalyticDomain.getActiveWithGeoInRange.mockResolvedValue(
                sessions
            );
            analyticAnomalyUtil.findImpossibleTravel.mockReturnValue([
                {
                    userId: 'user-1',
                    fromSessionId: 'session-1',
                    toSessionId: 'session-2',
                    distanceKm: 800,
                    deltaMs: 1000,
                },
                {
                    userId: 'user-1',
                    fromSessionId: 'session-2',
                    toSessionId: 'session-3',
                    distanceKm: 900,
                    deltaMs: 2000,
                },
            ]);

            const result = await domain.getImpossibleTravelUserIds(
                startDate,
                endDate
            );

            expect(result).toEqual(['user-1']);
            expect(
                sessionAnalyticDomain.getActiveWithGeoInRange
            ).toHaveBeenCalledWith(startDate, endDate, now);
            expect(
                analyticAnomalyUtil.findImpossibleTravel
            ).toHaveBeenCalledWith(sessions, 500, 3600000);
        });
    });

    describe('computeImpossibleTravel', () => {
        it('passes null dates and the current time into the session lookup', async () => {
            sessionAnalyticDomain.getActiveWithGeoInRange.mockResolvedValue([]);

            await domain['computeImpossibleTravel'](null, null);

            expect(
                sessionAnalyticDomain.getActiveWithGeoInRange
            ).toHaveBeenCalledWith(null, null, now);
        });

        it('returns the pairs the anomaly util flags with the configured limits', async () => {
            const sessions = [
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
            ];
            const flagged = [
                {
                    userId: 'user-1',
                    fromSessionId: 'session-1',
                    toSessionId: 'session-2',
                    distanceKm: 800,
                    deltaMs: 600000,
                },
            ];
            sessionAnalyticDomain.getActiveWithGeoInRange.mockResolvedValue(
                sessions
            );
            analyticAnomalyUtil.findImpossibleTravel.mockReturnValue(flagged);

            const result = await domain['computeImpossibleTravel'](
                startDate,
                endDate
            );

            expect(result).toBe(flagged);
            expect(
                analyticAnomalyUtil.findImpossibleTravel
            ).toHaveBeenCalledWith(sessions, 500, 3600000);
        });
    });

    describe('computeLoginSpikeIp', () => {
        it('keeps ips at or above the unique-account minimum, sorted by unique users', async () => {
            const logs = [
                {
                    id: 'e1',
                    userId: 'user-1',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: '10.0.0.1',
                    createdAt: startDate,
                    workspaceId: null,
                    userAgent: null,
                },
            ];
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                logs
            );
            analyticAnomalyUtil.groupByIp.mockReturnValue(
                new Map([
                    ['10.0.0.1', { users: new Set(['a', 'b']), count: 2 }],
                    ['unknown', { users: new Set(['a', 'b', 'c']), count: 3 }],
                    ['10.0.0.2', { users: new Set(['a']), count: 1 }],
                ])
            );

            const result = await domain['computeLoginSpikeIp'](3600000);

            expect(result).toEqual([
                { ipAddress: 'unknown', uniqueUsers: 3, attempts: 3 },
                { ipAddress: '10.0.0.1', uniqueUsers: 2, attempts: 2 },
            ]);
            expect(analyticAnomalyUtil.groupByIp).toHaveBeenCalledWith(logs);
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(3600000);
        });
    });

    describe('computeLoginTimeAnomalies', () => {
        it('uses now and the configured lookback when dates are omitted', async () => {
            const defaultStart = new Date('2026-01-30T00:00:00.000Z');
            helperDateService.backward.mockReturnValue(defaultStart);
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                []
            );

            await domain['computeLoginTimeAnomalies'](null, null);

            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                Duration.fromMillis(2592000000)
            );
            expect(
                activityLogAnalyticDomain.getManyByActionsInRange
            ).toHaveBeenCalledWith(UserLoginAnalyticActions, defaultStart, now);
        });

        it('returns the anomalies the anomaly util finds at the configured threshold', async () => {
            const logs = [
                {
                    id: 'e0',
                    userId: 'user-1',
                    action: EnumActivityLogAction.userLoginCredential,
                    ipAddress: '10.0.0.1',
                    createdAt: startDate,
                    workspaceId: null,
                    userAgent: null,
                },
            ];
            const anomalies = [
                {
                    userId: 'user-1',
                    lastHour: 3,
                    historicalFrequencyPercent: 5,
                },
            ];
            activityLogAnalyticDomain.getManyByActionsInRange.mockResolvedValue(
                logs
            );
            analyticAnomalyUtil.findLoginTimeAnomalies.mockReturnValue(
                anomalies
            );

            const result = await domain['computeLoginTimeAnomalies'](
                startDate,
                endDate
            );

            expect(result).toBe(anomalies);
            expect(
                activityLogAnalyticDomain.getManyByActionsInRange
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                startDate,
                endDate
            );
            expect(
                analyticAnomalyUtil.findLoginTimeAnomalies
            ).toHaveBeenCalledWith(logs, 20, 5);
        });
    });
});

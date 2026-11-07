import { chunk } from 'lodash-es';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Duration } from 'luxon';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticDeviceProliferationAvailableOrderBy,
    AnalyticImpossibleTravelAvailableOrderBy,
    AnalyticLoginSpikeIpAvailableOrderBy,
    AnalyticLoginTimeAnomalyAvailableOrderBy,
} from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticAnomalyUtil } from '@modules/analytic/utils/analytic.anomaly.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { DeviceAnalyticService } from '@modules/device/services/device.analytic.service';
import { SessionAnalyticService } from '@modules/session/services/session.analytic.service';
import { UserAnalyticService } from '@modules/user/services/user.analytic.service';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { createAnalyticAnomalyService } from '@test/unit/helpers/test.unit.analytic.helper';
import type { IAnalyticAnomalyServiceDoubles } from '@test/unit/helpers/test.unit.analytic.helper';

describe('AnalyticAnomalyService', () => {
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>();
    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const analyticAnomalyUtil: MockProxy<AnalyticAnomalyUtil> =
        mock<AnalyticAnomalyUtil>();
    const analyticSortUtil: MockProxy<AnalyticSortUtil> =
        mock<AnalyticSortUtil>();
    const analyticFraudUtil: MockProxy<AnalyticFraudUtil> =
        mock<AnalyticFraudUtil>();
    const paginationOffsetUtil: MockProxy<PaginationOffsetUtil> =
        mock<PaginationOffsetUtil>();
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const sessionAnalyticService: MockProxy<SessionAnalyticService> =
        mock<SessionAnalyticService>();
    const userAnalyticService: MockProxy<UserAnalyticService> =
        mock<UserAnalyticService>();
    const activityLogAnalyticService: MockProxy<ActivityLogAnalyticService> =
        mock<ActivityLogAnalyticService>();
    const deviceAnalyticService: MockProxy<DeviceAnalyticService> =
        mock<DeviceAnalyticService>();

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

    let service: AnalyticAnomalyService;

    const doubles: IAnalyticAnomalyServiceDoubles = {
        analyticCache,
        analyticDateService,
        analyticDateUtil,
        analyticAnomalyUtil,
        analyticSortUtil,
        analyticFraudUtil,
        paginationOffsetUtil,
        configService,
        helperArrayService,
        helperDateService,
        sessionAnalyticService,
        userAnalyticService,
        activityLogAnalyticService,
        deviceAnalyticService,
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
                'analytic.anomaly.loginTimeAnomaly.historyLimit': 1000,
                'analytic.anomaly.minSample': 5,
                'analytic.anomaly.lookbackInMs': 2592000000,
                'analytic.anomaly.concurrency': 10,
                'auth.password.maxAttempt': 5,
                'analytic.anomaly.deviceProliferation.zScoreThreshold': 3,
            };
            return values[key];
        });
        analyticFraudUtil.nearLockoutThreshold.mockReturnValue(4);
        analyticCache.getAnomalySummary.mockResolvedValue(null);
        analyticDateService.resolveWindow.mockImplementation(
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
        analyticAnomalyUtil.findLoginTimeAnomaly.mockReturnValue(null);
        helperArrayService.chunk.mockImplementation((rows, size) =>
            chunk(rows, size)
        );
        activityLogAnalyticService.getGroupIpUserByActions.mockResolvedValue(
            []
        );
        activityLogAnalyticService.getGroupUserByActions.mockResolvedValue([]);
        analyticSortUtil.sortPage.mockReturnValue({ data: [], total: 0 });
        paginationOffsetUtil.page.mockReturnValue(offsetPage);

        service = await createAnalyticAnomalyService(doubles);
    });

    describe('impossibleTravelSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 9, window: 'window-token' };
            analyticCache.getAnomalySummary.mockResolvedValue(cached);

            const result = await service.impossibleTravelSummary(
                startDate,
                endDate
            );

            expect(result).toEqual(cached);
            expect(
                sessionAnalyticService.getActiveWithGeoInRange
            ).not.toHaveBeenCalled();
        });

        it('computes and caches the summary on a cache miss', async () => {
            sessionAnalyticService.getActiveWithGeoInRange.mockResolvedValue(
                []
            );

            const result = await service.impossibleTravelSummary(
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
        it('pages the computed rows through PaginationOffsetUtil.page', async () => {
            sessionAnalyticService.getActiveWithGeoInRange.mockResolvedValue(
                []
            );

            const result = await service.impossibleTravelList(
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
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith([], 0, {
                skip: 0,
                limit: 20,
            });
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            sessionAnalyticService.getActiveWithGeoInRange.mockResolvedValue(
                []
            );
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

            await service.impossibleTravelList(startDate, endDate, {
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
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
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

            const result = await service.loginSpikeIpSummary(null);

            expect(result).toEqual(cached);
            expect(
                activityLogAnalyticService.getGroupIpUserByActions
            ).not.toHaveBeenCalled();
        });

        it('uses the configured window when windowMs is omitted', async () => {
            const result = await service.loginSpikeIpSummary(null);

            expect(result.window).toBe('3600000');
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(3600000);
            expect(
                activityLogAnalyticService.getGroupIpUserByActions
            ).toHaveBeenCalledWith(UserLoginAnalyticActions, startDate, now);
        });

        it('uses the supplied windowMs when present', async () => {
            const result = await service.loginSpikeIpSummary(600000);

            expect(result.window).toBe('600000');
            expect(analyticDateService.resolveWindow).toHaveBeenCalledWith(
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
            const result = await service.loginSpikeIpList(null, pagination);

            expect(result).toEqual(offsetPage);
            expect(analyticSortUtil.sortPage).toHaveBeenCalledWith(
                [],
                pagination,
                AnalyticLoginSpikeIpAvailableOrderBy
            );
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith([], 0, {
                skip: 0,
                limit: 20,
            });
        });

        it('pages the sorted slice and total the sort util returns', async () => {
            const sorted = [
                { ipAddress: '10.0.0.1', uniqueUsers: 4, attempts: 9 },
                { ipAddress: '10.0.0.2', uniqueUsers: 2, attempts: 5 },
            ];
            analyticSortUtil.sortPage.mockReturnValue({
                data: [sorted[1]!],
                total: 2,
            });

            await service.loginSpikeIpList(null, {
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
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
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

            const result = await service.failedLoginSpikeSummary();

            expect(result).toEqual(cached);
            expect(
                userAnalyticService.getCountNearLockout
            ).not.toHaveBeenCalled();
        });

        it('caches the near-lockout count with a floor of one attempt', async () => {
            userAnalyticService.getGroupPasswordAttemptBuckets.mockResolvedValue(
                [{ key: '3', count: 2 }]
            );
            userAnalyticService.getCountNearLockout.mockResolvedValue(1);

            const result = await service.failedLoginSpikeSummary();

            expect(result).toEqual({
                count: 1,
                window: null,
                meta: { nearLockoutMinAttempt: 4, bucketCount: 1 },
            });
            expect(
                userAnalyticService.getCountNearLockout
            ).toHaveBeenCalledWith(4);
        });
    });

    describe('failedLoginSpikeList', () => {
        it('lists near-lockout users at maxAttempt minus offset', async () => {
            userAnalyticService.getListNearLockoutOffset.mockResolvedValue(
                offsetPage
            );

            const result = await service.failedLoginSpikeList(pagination);

            expect(result).toEqual(offsetPage);
            expect(
                userAnalyticService.getListNearLockoutOffset
            ).toHaveBeenCalledWith(4, pagination);
        });

        it('takes the near-lockout min attempt from the fraud util for the password max attempt', async () => {
            analyticFraudUtil.nearLockoutThreshold.mockReturnValue(1);
            service = await createAnalyticAnomalyService(doubles);
            userAnalyticService.getListNearLockoutOffset.mockResolvedValue(
                offsetPage
            );

            await service.failedLoginSpikeList(pagination);

            expect(analyticFraudUtil.nearLockoutThreshold).toHaveBeenCalledWith(
                5
            );
            expect(
                userAnalyticService.getListNearLockoutOffset
            ).toHaveBeenCalledWith(1, pagination);
        });
    });

    describe('deviceProliferationSummary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = { count: 2, window: null };
            analyticCache.getAnomalySummary.mockResolvedValue(cached);

            const result = await service.deviceProliferationSummary();

            expect(result).toEqual(cached);
            expect(
                deviceAnalyticService.getProliferationOutliers
            ).not.toHaveBeenCalled();
        });

        it('caches outlier statistics on a cache miss', async () => {
            deviceAnalyticService.getProliferationOutliers.mockResolvedValue({
                count: 1,
                avg: 2,
                stdDev: 0.5,
                rows: [{ userId: 'user-1', deviceCount: 8, zScore: 3.1 }],
            });

            const result = await service.deviceProliferationSummary();

            expect(result).toEqual({
                count: 1,
                window: null,
                meta: { avg: 2, stdDev: 0.5, zScoreThreshold: 3 },
            });
        });
    });

    describe('deviceProliferationList', () => {
        it('pages outlier rows through PaginationOffsetUtil.page', async () => {
            const rows = [
                { userId: 'user-1', deviceCount: 8, zScore: 3.1 },
                { userId: 'user-2', deviceCount: 9, zScore: 3.4 },
            ];
            deviceAnalyticService.getProliferationOutliers.mockResolvedValue({
                count: 2,
                avg: 2,
                stdDev: 0.5,
                rows,
            });
            analyticSortUtil.sortPage.mockReturnValue({
                data: [rows[1]!],
                total: 2,
            });

            const result = await service.deviceProliferationList({
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
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
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
            deviceAnalyticService.getProliferationOutliers.mockResolvedValue({
                count: 2,
                avg: 2,
                stdDev: 0.5,
                rows,
            });
            analyticSortUtil.sortPage.mockReturnValue({
                data: [rows[1]!],
                total: 2,
            });

            await service.deviceProliferationList({
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
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
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

            const result = await service.loginTimeSummary(startDate, endDate);

            expect(result).toEqual(cached);
        });

        it('computes and caches the summary on a cache miss', async () => {
            const result = await service.loginTimeSummary(startDate, endDate);

            expect(result).toEqual({ count: 0, window: 'window-token' });
            expect(analyticCache.setAnomalySummary).toHaveBeenCalledWith(
                'login-time',
                'window-token',
                result
            );
        });
    });

    describe('loginTimeList', () => {
        it('pages login-time anomalies through PaginationOffsetUtil.page', async () => {
            const result = await service.loginTimeList(
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
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith([], 0, {
                skip: 0,
                limit: 20,
            });
        });

        it('pages the sorted slice and total the sort util returns', async () => {
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

            await service.loginTimeList(startDate, endDate, {
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
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(
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
            sessionAnalyticService.getActiveWithGeoInRange.mockResolvedValue(
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

            const result = await service.getImpossibleTravelUserIds(
                startDate,
                endDate
            );

            expect(result).toEqual(['user-1']);
            expect(
                sessionAnalyticService.getActiveWithGeoInRange
            ).toHaveBeenCalledWith(startDate, endDate, now);
            expect(
                analyticAnomalyUtil.findImpossibleTravel
            ).toHaveBeenCalledWith(sessions, 500, 3600000);
        });
    });

    describe('computeImpossibleTravel', () => {
        it('passes null dates and the current time into the session lookup', async () => {
            sessionAnalyticService.getActiveWithGeoInRange.mockResolvedValue(
                []
            );

            await service['computeImpossibleTravel'](null, null);

            expect(
                sessionAnalyticService.getActiveWithGeoInRange
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
            sessionAnalyticService.getActiveWithGeoInRange.mockResolvedValue(
                sessions
            );
            analyticAnomalyUtil.findImpossibleTravel.mockReturnValue(flagged);

            const result = await service['computeImpossibleTravel'](
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
            const pairs = [
                { ipAddress: '10.0.0.1', userId: 'user-1', count: 1 },
            ];
            activityLogAnalyticService.getGroupIpUserByActions.mockResolvedValue(
                pairs
            );
            analyticAnomalyUtil.groupByIp.mockReturnValue(
                new Map([
                    ['10.0.0.1', { users: new Set(['a', 'b']), count: 2 }],
                    ['unknown', { users: new Set(['a', 'b', 'c']), count: 3 }],
                    ['10.0.0.2', { users: new Set(['a']), count: 1 }],
                ])
            );

            const result = await service['computeLoginSpikeIp'](3600000);

            expect(result).toEqual([
                { ipAddress: 'unknown', uniqueUsers: 3, attempts: 3 },
                { ipAddress: '10.0.0.1', uniqueUsers: 2, attempts: 2 },
            ]);
            expect(analyticAnomalyUtil.groupByIp).toHaveBeenCalledWith(pairs);
            expect(analyticDateUtil.windowRange).toHaveBeenCalledWith(3600000);
        });
    });

    describe('computeLoginTimeAnomalies', () => {
        it('uses now and the configured lookback when dates are omitted', async () => {
            const defaultStart = new Date('2026-01-30T00:00:00.000Z');
            helperDateService.backward.mockReturnValue(defaultStart);

            await service['computeLoginTimeAnomalies'](null, null);

            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                Duration.fromMillis(2592000000)
            );
            expect(
                activityLogAnalyticService.getGroupUserByActions
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                defaultStart,
                now,
                5
            );
        });

        it('reads each narrowed user history in chunks of analytic.anomaly.concurrency and keeps the anomalies the util finds', async () => {
            const firstHistory = [startDate, endDate];
            const secondHistory = [startDate];
            const anomaly = {
                userId: 'user-1',
                lastHour: 3,
                historicalFrequencyPercent: 5,
            };
            activityLogAnalyticService.getGroupUserByActions.mockResolvedValue([
                { userId: 'user-1', count: 6 },
                { userId: 'user-2', count: 5 },
            ]);
            activityLogAnalyticService.getCreatedAtByUserActionsInRange
                .mockResolvedValueOnce(firstHistory)
                .mockResolvedValueOnce(secondHistory);
            analyticAnomalyUtil.findLoginTimeAnomaly
                .mockReturnValueOnce(anomaly)
                .mockReturnValueOnce(null);

            const result = await service['computeLoginTimeAnomalies'](
                startDate,
                endDate
            );

            expect(result).toEqual([anomaly]);
            expect(helperArrayService.chunk).toHaveBeenCalledWith(
                [
                    { userId: 'user-1', count: 6 },
                    { userId: 'user-2', count: 5 },
                ],
                10
            );
            expect(
                activityLogAnalyticService.getCreatedAtByUserActionsInRange
            ).toHaveBeenCalledWith(
                'user-2',
                UserLoginAnalyticActions,
                startDate,
                endDate,
                1000
            );
            expect(
                analyticAnomalyUtil.findLoginTimeAnomaly
            ).toHaveBeenNthCalledWith(1, 'user-1', firstHistory, 20);
            expect(
                analyticAnomalyUtil.findLoginTimeAnomaly
            ).toHaveBeenNthCalledWith(2, 'user-2', secondHistory, 20);
        });

        it('passes analytic.anomaly.loginTimeAnomaly.historyLimit to the history read', async () => {
            activityLogAnalyticService.getGroupUserByActions.mockResolvedValue([
                { userId: 'user-1', count: 6 },
            ]);
            activityLogAnalyticService.getCreatedAtByUserActionsInRange.mockResolvedValue(
                [startDate]
            );
            analyticAnomalyUtil.findLoginTimeAnomaly.mockReturnValue(null);

            await service['computeLoginTimeAnomalies'](startDate, endDate);

            expect(
                activityLogAnalyticService.getCreatedAtByUserActionsInRange
            ).toHaveBeenCalledWith(
                'user-1',
                UserLoginAnalyticActions,
                startDate,
                endDate,
                1000
            );
        });
    });
});

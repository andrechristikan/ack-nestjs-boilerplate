import type {
    IRequestUserAgent,
    IRequestGeoLocation,
} from '@common/request/interfaces/request.interface';
import { chunk } from 'lodash-es';
import { CacheService } from '@common/cache/services/cache.service';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
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

import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticAnomalyDeviceProliferationSummaryCacheSchema,
    AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema,
    AnalyticAnomalyImpossibleTravelSummaryCacheSchema,
    AnalyticAnomalyLoginSpikeIpSummaryCacheSchema,
    AnalyticAnomalySummaryCacheSchema,
    AnalyticCacheEmptyToken,
} from '@modules/analytic/constants/analytic.constant';
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
import { EnumAnalyticAnomalySignal } from '@modules/analytic/enums/analytic.enum';
import { DeviceAnalyticService } from '@modules/device/services/device.analytic.service';
import { SessionAnalyticService } from '@modules/session/services/session.analytic.service';
import { UserAnalyticService } from '@modules/user/services/user.analytic.service';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import {
    buildAnalyticSession,
    createAnalyticAnomalyService,
} from '@test/unit/helpers/test.unit.analytic.helper';
import type { IAnalyticAnomalyServiceDoubles } from '@test/unit/helpers/test.unit.analytic.helper';

describe('AnalyticAnomalyService', () => {
    const anomalySummaryTtlInMs = 900000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        anomalySummaryTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
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
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();
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
    const emptyAgent: IRequestUserAgent = {
        ua: null,
        browser: null,
        cpu: { architecture: null },
        device: { type: null, vendor: null, model: null },
        engine: { name: null, version: null },
        os: { name: null, version: null },
    };
    const nyc: IRequestGeoLocation = {
        latitude: 40.7,
        longitude: -74,
        country: 'US',
        region: 'NY',
        city: 'New York',
    };
    const london: IRequestGeoLocation = {
        latitude: 51.5,
        longitude: -0.1,
        country: 'GB',
        region: 'ENG',
        city: 'London',
    };

    let service: AnalyticAnomalyService;

    const doubles: IAnalyticAnomalyServiceDoubles = {
        analyticCache,
        cacheService,
        analyticDateService,
        analyticDateUtil,
        analyticAnomalyUtil,
        analyticSortUtil,
        analyticFraudUtil,
        paginationOffsetUtil,
        configService,
        helperArrayService,
        helperDateService,
        helperNumberService,
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
                'analytic.anomaly.deviceProliferation.zScoreThreshold': 3,
            };
            return values[key];
        });
        userAnalyticService.getPasswordMaxAttempts.mockResolvedValue(5);
        analyticFraudUtil.nearLockoutThreshold.mockReturnValue(4);
        analyticCache.buildAnomalySummaryKey.mockImplementation(
            (signal, window) => `${signal}:${window}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );
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
        helperDateService.getHour.mockImplementation(date =>
            date.getUTCHours()
        );
        helperNumberService.percent.mockImplementation((part, total) =>
            total === 0 ? 0 : (part / total) * 100
        );
        analyticAnomalyUtil.groupByIp.mockReturnValue(new Map());
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
        it('reads through with the impossible-travel key, AnalyticAnomalyImpossibleTravelSummaryCacheSchema, and the anomaly summary TTL', async () => {
            const cached = {
                count: 9,
                window: 'window-token',
                meta: { minDistanceKm: 500, maxDeltaInMs: 3600000 },
            };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.impossibleTravelSummary(
                startDate,
                endDate
            );

            expect(result).toEqual(cached);
            expect(analyticCache.buildAnomalySummaryKey).toHaveBeenCalledWith(
                EnumAnalyticAnomalySignal.impossibleTravel,
                'window-token'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'impossible-travel:window-token',
                AnalyticAnomalyImpossibleTravelSummaryCacheSchema,
                anomalySummaryTtlInMs,
                expect.any(Function)
            );
            expect(
                sessionAnalyticService.getActiveWithGeoInRange
            ).not.toHaveBeenCalled();
        });

        it('computes the summary in the loader on a cache miss', async () => {
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
        it('reads through with the login-spike-ip key, AnalyticAnomalyLoginSpikeIpSummaryCacheSchema, and the anomaly summary TTL', async () => {
            const cached = {
                count: 2,
                window: '3600000',
                meta: { minUniqueAccounts: 2 },
            };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.loginSpikeIpSummary(null);

            expect(result).toEqual(cached);
            expect(analyticCache.buildAnomalySummaryKey).toHaveBeenCalledWith(
                EnumAnalyticAnomalySignal.loginSpikeIp,
                '3600000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'login-spike-ip:3600000',
                AnalyticAnomalyLoginSpikeIpSummaryCacheSchema,
                anomalySummaryTtlInMs,
                expect.any(Function)
            );
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

            expect(result).toEqual({
                count: 0,
                window: '600000',
                meta: { minUniqueAccounts: 2 },
            });
            expect(analyticDateService.resolveWindow).toHaveBeenCalledWith(
                600000,
                3600000
            );
            expect(analyticCache.buildAnomalySummaryKey).toHaveBeenCalledWith(
                EnumAnalyticAnomalySignal.loginSpikeIp,
                '600000'
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
        it('reads through with the failed-login-spike key, AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema, and the anomaly summary TTL', async () => {
            const cached = {
                count: 1,
                window: null,
                meta: { nearLockoutMinAttempt: 4, bucketCount: 1 },
            };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.failedLoginSpikeSummary();

            expect(result).toEqual(cached);
            expect(analyticCache.buildAnomalySummaryKey).toHaveBeenCalledWith(
                EnumAnalyticAnomalySignal.failedLoginSpike,
                AnalyticCacheEmptyToken
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `failed-login-spike:${AnalyticCacheEmptyToken}`,
                AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema,
                anomalySummaryTtlInMs,
                expect.any(Function)
            );
            expect(
                userAnalyticService.getCountNearLockout
            ).not.toHaveBeenCalled();
        });

        it('computes the near-lockout count in the loader on a cache miss', async () => {
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
            ).toHaveBeenCalledWith(4, now);
            expect(
                userAnalyticService.getGroupPasswordAttemptBuckets
            ).toHaveBeenCalledWith(5, now);
        });

        it.each([
            { maxAttempt: 5, minAttempt: 4 },
            { maxAttempt: 8, minAttempt: 7 },
        ])(
            'follows the password max attempt $maxAttempt the user analytic service returns',
            async ({ maxAttempt, minAttempt }) => {
                userAnalyticService.getPasswordMaxAttempts.mockResolvedValue(
                    maxAttempt
                );
                analyticFraudUtil.nearLockoutThreshold.mockReturnValue(
                    minAttempt
                );
                userAnalyticService.getGroupPasswordAttemptBuckets.mockResolvedValue(
                    []
                );
                userAnalyticService.getCountNearLockout.mockResolvedValue(0);

                const result = await service.failedLoginSpikeSummary();

                expect(
                    analyticFraudUtil.nearLockoutThreshold
                ).toHaveBeenCalledWith(maxAttempt);
                expect(
                    userAnalyticService.getGroupPasswordAttemptBuckets
                ).toHaveBeenCalledWith(maxAttempt, now);
                expect(
                    userAnalyticService.getCountNearLockout
                ).toHaveBeenCalledWith(minAttempt, now);
                expect(result.meta.nearLockoutMinAttempt).toBe(minAttempt);
            }
        );

        it('reads the password max attempt on a cache miss only', async () => {
            cacheService.readThrough.mockResolvedValue({
                count: 1,
                window: null,
                meta: { nearLockoutMinAttempt: 4, bucketCount: 1 },
            });

            await service.failedLoginSpikeSummary();

            expect(
                userAnalyticService.getPasswordMaxAttempts
            ).not.toHaveBeenCalled();
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
            ).toHaveBeenCalledWith(4, now, pagination);
        });

        it.each([
            { maxAttempt: 5, minAttempt: 4 },
            { maxAttempt: 8, minAttempt: 7 },
        ])(
            'takes the near-lockout min attempt from the fraud util for the password max attempt $maxAttempt',
            async ({ maxAttempt, minAttempt }) => {
                userAnalyticService.getPasswordMaxAttempts.mockResolvedValue(
                    maxAttempt
                );
                analyticFraudUtil.nearLockoutThreshold.mockReturnValue(
                    minAttempt
                );
                userAnalyticService.getListNearLockoutOffset.mockResolvedValue(
                    offsetPage
                );

                await service.failedLoginSpikeList(pagination);

                expect(
                    analyticFraudUtil.nearLockoutThreshold
                ).toHaveBeenCalledWith(maxAttempt);
                expect(
                    userAnalyticService.getListNearLockoutOffset
                ).toHaveBeenCalledWith(minAttempt, now, pagination);
            }
        );
    });

    describe('deviceProliferationSummary', () => {
        it('reads through with the device-proliferation key, AnalyticAnomalyDeviceProliferationSummaryCacheSchema, and the anomaly summary TTL', async () => {
            const cached = {
                count: 2,
                window: null,
                meta: { avg: 2, stdDev: 0.5, zScoreThreshold: 3 },
            };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.deviceProliferationSummary();

            expect(result).toEqual(cached);
            expect(analyticCache.buildAnomalySummaryKey).toHaveBeenCalledWith(
                EnumAnalyticAnomalySignal.deviceProliferation,
                AnalyticCacheEmptyToken
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `device-proliferation:${AnalyticCacheEmptyToken}`,
                AnalyticAnomalyDeviceProliferationSummaryCacheSchema,
                anomalySummaryTtlInMs,
                expect.any(Function)
            );
            expect(
                deviceAnalyticService.getProliferationOutliers
            ).not.toHaveBeenCalled();
        });

        it('computes the outlier statistics in the loader on a cache miss', async () => {
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
        it('reads through with the login-time key, AnalyticAnomalySummaryCacheSchema, and the anomaly summary TTL', async () => {
            const cached = { count: 3, window: 'window-token' };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.loginTimeSummary(startDate, endDate);

            expect(result).toEqual(cached);
            expect(analyticCache.buildAnomalySummaryKey).toHaveBeenCalledWith(
                EnumAnalyticAnomalySignal.loginTime,
                'window-token'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'login-time:window-token',
                AnalyticAnomalySummaryCacheSchema,
                anomalySummaryTtlInMs,
                expect.any(Function)
            );
            expect(
                activityLogAnalyticService.getGroupUserByActions
            ).not.toHaveBeenCalled();
        });

        it('computes the summary in the loader on a cache miss', async () => {
            const result = await service.loginTimeSummary(startDate, endDate);

            expect(result).toEqual({ count: 0, window: 'window-token' });
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
                buildAnalyticSession(
                    'session-1',
                    'user-1',
                    startDate,
                    nyc,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'session-2',
                    'user-1',
                    new Date('2026-01-01T00:10:00.000Z'),
                    london,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'session-3',
                    'user-1',
                    new Date('2026-01-01T00:20:00.000Z'),
                    nyc,
                    emptyAgent
                ),
            ];
            sessionAnalyticService.getActiveWithGeoInRange.mockResolvedValue(
                sessions
            );

            const result = await service.getImpossibleTravelUserIds(
                startDate,
                endDate
            );

            expect(result).toEqual(['user-1']);
            expect(
                sessionAnalyticService.getActiveWithGeoInRange
            ).toHaveBeenCalledWith(startDate, endDate, now);
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

        it('returns the pairs flagged with the configured limits', async () => {
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
            sessionAnalyticService.getActiveWithGeoInRange.mockResolvedValue(
                sessions
            );

            const result = await service['computeImpossibleTravel'](
                startDate,
                endDate
            );

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                userId: 'user-1',
                fromSessionId: 'session-1',
                toSessionId: 'session-2',
                deltaMs: 600000,
            });
            expect(result[0]!.distanceKm).toBeGreaterThan(500);
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

        it('reads each narrowed user history in chunks of analytic.anomaly.concurrency and keeps the anomalies it finds', async () => {
            const firstHistory = [
                startDate,
                new Date('2026-01-01T03:00:00.000Z'),
            ];
            const secondHistory = [startDate, startDate];
            const anomaly = {
                userId: 'user-1',
                lastHour: 3,
                historicalFrequencyPercent: 0,
            };
            activityLogAnalyticService.getGroupUserByActions.mockResolvedValue([
                { userId: 'user-1', count: 6 },
                { userId: 'user-2', count: 5 },
            ]);
            activityLogAnalyticService.getCreatedAtByUserActionsInRange
                .mockResolvedValueOnce(firstHistory)
                .mockResolvedValueOnce(secondHistory);

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
            expect(helperNumberService.percent).toHaveBeenNthCalledWith(
                1,
                0,
                1
            );
            expect(helperNumberService.percent).toHaveBeenNthCalledWith(
                2,
                1,
                1
            );
        });

        it('passes analytic.anomaly.loginTimeAnomaly.historyLimit to the history read', async () => {
            activityLogAnalyticService.getGroupUserByActions.mockResolvedValue([
                { userId: 'user-1', count: 6 },
            ]);
            activityLogAnalyticService.getCreatedAtByUserActionsInRange.mockResolvedValue(
                [startDate]
            );

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

    describe('findImpossibleTravel', () => {
        const tenMinutesLater = new Date('2026-01-01T00:10:00.000Z');
        const nextDay = new Date('2026-01-02T00:00:00.000Z');
        const nearNyc: IRequestGeoLocation = {
            ...nyc,
            latitude: 40.8,
            longitude: -74.1,
        };

        it('flags consecutive sessions that travel too far too fast', () => {
            const sessions = [
                buildAnalyticSession(
                    'session-1',
                    'user-1',
                    startDate,
                    nyc,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'session-2',
                    'user-1',
                    tenMinutesLater,
                    london,
                    emptyAgent
                ),
            ];

            const result = service['findImpossibleTravel'](
                sessions,
                500,
                3600000
            );

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                userId: 'user-1',
                fromSessionId: 'session-1',
                toSessionId: 'session-2',
                deltaMs: 600000,
            });
            expect(result[0]!.distanceKm).toBeGreaterThan(5000);
        });

        it('pairs sessions per user and never across users', () => {
            const sessions = [
                buildAnalyticSession(
                    'a1',
                    'user-a',
                    startDate,
                    nyc,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'b1',
                    'user-b',
                    tenMinutesLater,
                    london,
                    emptyAgent
                ),
            ];

            expect(
                service['findImpossibleTravel'](sessions, 500, 3600000)
            ).toEqual([]);
        });

        it('skips a pair when either session has no geo', () => {
            const sessions = [
                buildAnalyticSession(
                    'a1',
                    'user-a',
                    startDate,
                    null,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'a2',
                    'user-a',
                    tenMinutesLater,
                    london,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'b1',
                    'user-b',
                    startDate,
                    nyc,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'b2',
                    'user-b',
                    tenMinutesLater,
                    null,
                    emptyAgent
                ),
            ];

            expect(
                service['findImpossibleTravel'](sessions, 500, 3600000)
            ).toEqual([]);
        });

        it('skips a pair when the distance is not above the minimum', () => {
            const sessions = [
                buildAnalyticSession(
                    'c1',
                    'user-c',
                    startDate,
                    nyc,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'c2',
                    'user-c',
                    tenMinutesLater,
                    nearNyc,
                    emptyAgent
                ),
            ];

            expect(
                service['findImpossibleTravel'](sessions, 500, 3600000)
            ).toEqual([]);
        });

        it('skips a pair when the delta is not below the maximum', () => {
            const sessions = [
                buildAnalyticSession(
                    'd1',
                    'user-d',
                    startDate,
                    nyc,
                    emptyAgent
                ),
                buildAnalyticSession(
                    'd2',
                    'user-d',
                    nextDay,
                    london,
                    emptyAgent
                ),
            ];

            expect(
                service['findImpossibleTravel'](sessions, 500, 3600000)
            ).toEqual([]);
        });

        it('returns nothing for a single session or none', () => {
            expect(
                service['findImpossibleTravel'](
                    [
                        buildAnalyticSession(
                            'solo',
                            'user-solo',
                            startDate,
                            nyc,
                            emptyAgent
                        ),
                    ],
                    500,
                    3600000
                )
            ).toEqual([]);
            expect(service['findImpossibleTravel']([], 500, 3600000)).toEqual(
                []
            );
        });
    });

    describe('findLoginTimeAnomaly', () => {
        const eightAm = new Date('2026-01-01T08:00:00.000Z');
        const threeAm = new Date('2026-01-01T03:00:00.000Z');

        it('flags a last hour absent from the prior logins using a histogram that excludes the last login', () => {
            const logins = [
                eightAm,
                eightAm,
                eightAm,
                eightAm,
                eightAm,
                threeAm,
            ];

            const result = service['findLoginTimeAnomaly'](
                'user-1',
                logins,
                20
            );

            expect(result).toEqual({
                userId: 'user-1',
                lastHour: 3,
                historicalFrequencyPercent: 0,
            });
            expect(helperNumberService.percent).toHaveBeenCalledWith(0, 5);
        });

        it('buckets logins by the hour HelperDateService returns in the configured timezone', () => {
            const beforeMidnight = new Date('2026-01-01T16:00:00.000Z');
            const afterMidnight = new Date('2026-01-01T17:00:00.000Z');
            helperDateService.getHour.mockImplementation(date =>
                date.getTime() === afterMidnight.getTime() ? 0 : 23
            );
            const logins = [
                beforeMidnight,
                beforeMidnight,
                beforeMidnight,
                beforeMidnight,
                afterMidnight,
            ];

            const result = service['findLoginTimeAnomaly'](
                'user-1',
                logins,
                20
            );

            expect(result).toEqual({
                userId: 'user-1',
                lastHour: 0,
                historicalFrequencyPercent: 0,
            });
            expect(helperDateService.getHour).toHaveBeenCalledWith(
                afterMidnight
            );
            expect(helperNumberService.percent).toHaveBeenCalledWith(0, 4);
        });

        it('returns null when the last hour frequency reaches the threshold', () => {
            const logins = [eightAm, eightAm, eightAm, eightAm, eightAm];

            expect(
                service['findLoginTimeAnomaly']('user-keep', logins, 20)
            ).toBeNull();
            expect(helperNumberService.percent).toHaveBeenCalledWith(4, 4);
        });
    });

    describe('distanceKm', () => {
        it('returns 0 when both points are the same', () => {
            expect(
                service['distanceKm'](40.7128, -74.006, 40.7128, -74.006)
            ).toBe(0);
        });

        it('returns half the earth circumference for antipodal longitudes at the equator', () => {
            expect(service['distanceKm'](0, 0, 0, 180)).toBeCloseTo(20015.1, 1);
        });
    });
});

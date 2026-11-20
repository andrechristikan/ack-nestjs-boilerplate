import { CacheService } from '@common/cache/services/cache.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema,
    AnalyticAnomalyLoginSpikeIpSummaryCacheSchema,
    AnalyticCacheEmptyToken,
    AnalyticDeviceProliferationSnapshotDataSchema,
    AnalyticDeviceProliferationSnapshotMetaSchema,
    AnalyticImpossibleTravelSnapshotDataSchema,
    AnalyticImpossibleTravelSnapshotMetaSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticAnomalySignal } from '@modules/analytic/enums/analytic.enum';
import { AnalyticAnomalyRepository } from '@modules/analytic/repositories/analytic.anomaly.repository';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { createAnalyticAnomalyService } from '@test/unit/helpers/test.unit.analytic.helper';

describe('AnalyticAnomalyService', () => {
    const anomalySummaryTtlInMs = 900000;
    const liveSummaryTtlInMs = 60000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        anomalySummaryTtlInMs,
        liveSummaryTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    let configService: MockProxy<ConfigService>;
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const analyticSnapshotService: MockProxy<AnalyticSnapshotService> =
        mock<AnalyticSnapshotService>();
    const analyticAnomalyRepository: MockProxy<AnalyticAnomalyRepository> =
        mock<AnalyticAnomalyRepository>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const now: Date = new Date('2026-03-01T00:00:00.000Z');
    const loginSpikeRange = {
        startDate: new Date('2026-02-28T23:50:00.000Z'),
        endDate: now,
    };
    const lookbackRange = {
        startDate: new Date('2026-01-30T00:00:00.000Z'),
        endDate: now,
    };
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

    let service: AnalyticAnomalyService;

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'analytic.cache.windowTokenPattern': '{start}:{end}',
            'analytic.fraud.nearLockoutOffset': 1,
            'analytic.anomaly.impossibleTravel.minDistanceKm': 500,
            'analytic.anomaly.impossibleTravel.maxDeltaInMs': 3600000,
            'analytic.anomaly.loginSpikeIp.minUniqueAccounts': 2,
            'analytic.anomaly.loginSpikeIp.windowInMs': 600000,
            'analytic.anomaly.lookbackInMs': 2592000000,
            'analytic.anomaly.deviceProliferation.zScoreThreshold': 3,
            'app.timezone': 'Asia/Jakarta',
        });
        featureFlagService.getMetadataNumber.mockResolvedValue(5);
        analyticCache.buildAnomalySummaryKey.mockImplementation(
            (signal, window) => `${signal}:${window}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );
        vi.setSystemTime(now);

        service = await createAnalyticAnomalyService({
            analyticCache,
            cacheService,
            configService,
            featureFlagService,
            analyticSnapshotService,
            analyticAnomalyRepository,
        });
    });

    describe('impossibleTravelSummary', () => {
        it('reads the snapshot summary and returns its header fields and metadata', async () => {
            const computedAt = new Date('2026-02-28T23:45:00.000Z');
            analyticSnapshotService.getSummary.mockResolvedValue({
                count: 3,
                metadata: { minDistanceKm: 700, maxDeltaInMs: 1800000 },
                windowStart: startDate,
                windowEnd: endDate,
                computedAt,
            });

            const result = await service.impossibleTravelSummary();

            expect(result).toEqual({
                count: 3,
                windowStart: startDate,
                windowEnd: endDate,
                computedAt,
                metadata: { minDistanceKm: 700, maxDeltaInMs: 1800000 },
            });
            expect(analyticSnapshotService.getSummary).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.impossibleTravel,
                AnalyticImpossibleTravelSnapshotMetaSchema
            );
        });

        it('answers the configured thresholds and null dates before the first run', async () => {
            analyticSnapshotService.getSummary.mockResolvedValue({
                count: 0,
                metadata: null,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
            });

            const result = await service.impossibleTravelSummary();

            expect(result).toEqual({
                count: 0,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
                metadata: { minDistanceKm: 500, maxDeltaInMs: 3600000 },
            });
            expect(cacheService.readThrough).not.toHaveBeenCalled();
            expect(
                analyticAnomalyRepository.findImpossibleTravel
            ).not.toHaveBeenCalled();
        });
    });

    describe('impossibleTravelList', () => {
        it('pages the snapshot rows of the impossible-travel signal', async () => {
            analyticSnapshotService.getListOffset.mockResolvedValue(offsetPage);

            const result = await service.impossibleTravelList(pagination);

            expect(result).toBe(offsetPage);
            expect(analyticSnapshotService.getListOffset).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.impossibleTravel,
                pagination,
                null,
                AnalyticImpossibleTravelSnapshotDataSchema
            );
        });
    });

    describe('loginSpikeIpSummary', () => {
        it('reads through with the login-spike-ip key for the configured window, the cache schema, and the anomaly summary TTL', async () => {
            analyticAnomalyRepository.countLoginSpikeIp.mockResolvedValue(3);

            await service.loginSpikeIpSummary();

            expect(analyticCache.buildAnomalySummaryKey).toHaveBeenCalledWith(
                EnumAnalyticAnomalySignal.loginSpikeIp,
                '600000'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticAnomalySignal.loginSpikeIp}:600000`,
                AnalyticAnomalyLoginSpikeIpSummaryCacheSchema,
                liveSummaryTtlInMs,
                expect.any(Function)
            );
        });

        it('counts once over the configured window and answers its dates, the minimum as metadata, and no computedAt', async () => {
            analyticAnomalyRepository.countLoginSpikeIp.mockResolvedValue(3);

            const result = await service.loginSpikeIpSummary();

            expect(result).toEqual({
                count: 3,
                windowStart: loginSpikeRange.startDate,
                windowEnd: now,
                computedAt: null,
                metadata: { minUniqueAccounts: 2 },
            });
            expect(
                analyticAnomalyRepository.countLoginSpikeIp
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAnomalyRepository.countLoginSpikeIp
            ).toHaveBeenCalledWith(loginSpikeRange, 2);
        });

        it('returns the cached answer without a count on a hit', async () => {
            const cached = {
                count: 1,
                windowStart: startDate,
                windowEnd: now,
                computedAt: null,
                metadata: { minUniqueAccounts: 2 },
            };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.loginSpikeIpSummary();

            expect(result).toEqual(cached);
            expect(
                analyticAnomalyRepository.countLoginSpikeIp
            ).not.toHaveBeenCalled();
        });
    });

    describe('loginSpikeIpList', () => {
        it('pages the repository over the configured window and minimum', async () => {
            analyticAnomalyRepository.findLoginSpikeIpOffset.mockResolvedValue(
                offsetPage
            );

            const result = await service.loginSpikeIpList(pagination);

            expect(result).toBe(offsetPage);
            expect(
                analyticAnomalyRepository.findLoginSpikeIpOffset
            ).toHaveBeenCalledWith(loginSpikeRange, 2, pagination);
        });
    });

    describe('failedLoginSpikeSummary', () => {
        it('reads through with the failed-login-spike key, AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema, and the anomaly summary TTL', async () => {
            const cached = {
                count: 1,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
                metadata: { nearLockoutMinAttempt: 4 },
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
                analyticAnomalyRepository.countNearLockout
            ).not.toHaveBeenCalled();
        });

        it('counts the near-lockout users once in the loader on a cache miss', async () => {
            analyticAnomalyRepository.countNearLockout.mockResolvedValue(1);

            const result = await service.failedLoginSpikeSummary();

            expect(result).toEqual({
                count: 1,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
                metadata: { nearLockoutMinAttempt: 4 },
            });
            expect(
                analyticAnomalyRepository.countNearLockout
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAnomalyRepository.countNearLockout
            ).toHaveBeenCalledWith(4, now);
        });

        it.each([
            { maxAttempt: 5, minAttempt: 4 },
            { maxAttempt: 8, minAttempt: 7 },
        ])(
            'reads the password budget $maxAttempt through the feature flag service and counts at the threshold of it',
            async ({ maxAttempt, minAttempt }) => {
                featureFlagService.getMetadataNumber.mockResolvedValue(
                    maxAttempt
                );
                analyticAnomalyRepository.countNearLockout.mockResolvedValue(0);

                const result = await service.failedLoginSpikeSummary();

                expect(
                    featureFlagService.getMetadataNumber
                ).toHaveBeenCalledWith(
                    EnumFeatureFlagKey.loginWithCredential,
                    EnumFeatureFlagMetadataKey.passwordMaxAttempts
                );
                expect(
                    analyticAnomalyRepository.countNearLockout
                ).toHaveBeenCalledWith(minAttempt, now);
                expect(result.metadata.nearLockoutMinAttempt).toBe(minAttempt);
            }
        );

        it('reads the password budget on a cache miss only', async () => {
            cacheService.readThrough.mockResolvedValue({
                count: 1,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
                metadata: { nearLockoutMinAttempt: 4 },
            });

            await service.failedLoginSpikeSummary();

            expect(featureFlagService.getMetadataNumber).not.toHaveBeenCalled();
        });
    });

    describe('failedLoginSpikeList', () => {
        it('lists near-lockout users at the threshold of the password budget', async () => {
            analyticAnomalyRepository.findNearLockoutOffset.mockResolvedValue(
                offsetPage
            );

            const result = await service.failedLoginSpikeList(pagination);

            expect(result).toEqual(offsetPage);
            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.loginWithCredential,
                EnumFeatureFlagMetadataKey.passwordMaxAttempts
            );
            expect(
                analyticAnomalyRepository.findNearLockoutOffset
            ).toHaveBeenCalledWith(4, now, pagination);
        });
    });

    describe('deviceProliferationSummary', () => {
        it('reads the snapshot summary and returns its header fields and metadata', async () => {
            const computedAt = new Date('2026-02-28T23:45:00.000Z');
            analyticSnapshotService.getSummary.mockResolvedValue({
                count: 2,
                metadata: { avg: 2.5, stdDev: 0.5, zScoreThreshold: 3 },
                windowStart: null,
                windowEnd: null,
                computedAt,
            });

            const result = await service.deviceProliferationSummary();

            expect(result).toEqual({
                count: 2,
                windowStart: null,
                windowEnd: null,
                computedAt,
                metadata: { avg: 2.5, stdDev: 0.5, zScoreThreshold: 3 },
            });
            expect(analyticSnapshotService.getSummary).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.deviceProliferation,
                AnalyticDeviceProliferationSnapshotMetaSchema
            );
        });

        it('answers the configured threshold with zero statistics before the first run', async () => {
            analyticSnapshotService.getSummary.mockResolvedValue({
                count: 0,
                metadata: null,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
            });

            const result = await service.deviceProliferationSummary();

            expect(result).toEqual({
                count: 0,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
                metadata: { avg: 0, stdDev: 0, zScoreThreshold: 3 },
            });
            expect(
                analyticAnomalyRepository.findDeviceProliferation
            ).not.toHaveBeenCalled();
        });
    });

    describe('deviceProliferationList', () => {
        it('pages the snapshot rows of the device-proliferation signal', async () => {
            analyticSnapshotService.getListOffset.mockResolvedValue(offsetPage);

            const result = await service.deviceProliferationList(pagination);

            expect(result).toBe(offsetPage);
            expect(analyticSnapshotService.getListOffset).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.deviceProliferation,
                pagination,
                null,
                AnalyticDeviceProliferationSnapshotDataSchema
            );
        });
    });

    describe('computeImpossibleTravel', () => {
        it('returns the items of one repository call over the lookback window with the thresholds as metadata', async () => {
            const items = [
                {
                    key: 'user-1',
                    value: 900,
                    occurredAt: endDate,
                    data: {
                        userId: 'user-1',
                        fromSessionId: 'session-1',
                        toSessionId: 'session-2',
                        distanceKm: 900,
                        deltaMs: 600000,
                    },
                },
            ];
            analyticAnomalyRepository.findImpossibleTravel.mockResolvedValue(
                items
            );

            const result = await service.computeImpossibleTravel();

            expect(result).toEqual({
                items,
                metadata: { minDistanceKm: 500, maxDeltaInMs: 3600000 },
                windowStart: lookbackRange.startDate,
                windowEnd: now,
            });
            expect(
                analyticAnomalyRepository.findImpossibleTravel
            ).toHaveBeenCalledWith(lookbackRange, {
                minDistanceKm: 500,
                maxDeltaInMs: 3600000,
            });
        });
    });

    describe('computeDeviceProliferation', () => {
        it('returns a row per outlier keyed by the user with the device count as value, the statistics as metadata, and no window', async () => {
            analyticAnomalyRepository.findDeviceProliferation.mockResolvedValue(
                {
                    avg: 2,
                    stdDev: 1.5,
                    rows: [{ userId: 'user-1', deviceCount: 9, zScore: 4.6 }],
                }
            );

            const result = await service.computeDeviceProliferation();

            expect(result).toEqual({
                items: [
                    {
                        key: 'user-1',
                        value: 9,
                        occurredAt: null,
                        data: { userId: 'user-1', deviceCount: 9, zScore: 4.6 },
                    },
                ],
                metadata: { avg: 2, stdDev: 1.5, zScoreThreshold: 3 },
                windowStart: null,
                windowEnd: null,
            });
            expect(
                analyticAnomalyRepository.findDeviceProliferation
            ).toHaveBeenCalledWith(3);
        });
    });
});

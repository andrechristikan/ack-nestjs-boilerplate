import { CacheService } from '@common/cache/services/cache.service';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumAnalyticSnapshotSignal,
    EnumPasswordHistoryType,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticBucketsResultCacheSchema,
    AnalyticConcurrentSessionsSnapshotDataSchema,
    AnalyticForgotPasswordConversionCacheSchema,
    AnalyticLockoutMetricsCacheSchema,
    AnalyticMetricCountCacheSchema,
    AnalyticMfaAdoptionSnapshotMetaSchema,
    AnalyticVerificationFunnelsCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import {
    EnumAnalyticDashboardMetric,
    EnumAnalyticGroupKey,
} from '@modules/analytic/enums/analytic.enum';
import { AnalyticAuthRepository } from '@modules/analytic/repositories/analytic.auth.repository';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { MfaUtil } from '@modules/mfa/utils/mfa.util';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('AnalyticAuthService', () => {
    const dashboardTtlInMs = 1800000;
    const idleTimeoutInMs = 604800000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        dashboardTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticSnapshotService: MockProxy<AnalyticSnapshotService> =
        mock<AnalyticSnapshotService>();
    const analyticAuthRepository: MockProxy<AnalyticAuthRepository> =
        mock<AnalyticAuthRepository>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const startToken = '2026-01-01T00:00:00.000Z';
    const endToken = '2026-02-01T00:00:00.000Z';
    const now: Date = new Date('2026-03-01T00:00:00.000Z');
    const idleSince: Date = new Date('2026-02-22T00:00:00.000Z');

    const cachedValue = { count: 99 };

    let configService: MockProxy<ConfigService>;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    let service: AnalyticAuthService;

    beforeEach(async () => {
        configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'analytic.cache.windowTokenPattern': 'Window:{start}:{end}',
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
                AnalyticAuthService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                { provide: ConfigService, useValue: configService },
                ...TestUnitKitProviders,
                AnalyticDateUtil,
                AnalyticBucketUtil,
                MfaUtil,
                {
                    provide: AnalyticSnapshotService,
                    useValue: analyticSnapshotService,
                },
                {
                    provide: AnalyticAuthRepository,
                    useValue: analyticAuthRepository,
                },
            ],
        }).compile();

        service = module.get(AnalyticAuthService);
    });

    describe('authSessionsGeo', () => {
        it('maps a null country key to unknown and keeps a country code', async () => {
            analyticAuthRepository.groupSessionsGeo.mockResolvedValue([
                { key: null, count: 3 },
                { key: 'ID', count: 4 },
            ]);

            const result = await service.authSessionsGeo(startDate, endDate);

            expect(result).toEqual({
                buckets: [
                    { key: EnumAnalyticGroupKey.unknown, count: 3 },
                    { key: 'ID', count: 4 },
                ],
            });
            expect(
                analyticAuthRepository.groupSessionsGeo
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.groupSessionsGeo
            ).toHaveBeenCalledWith(startDate, endDate, now, idleSince);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authSessionsGeo}:${startToken}:${endToken}`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authLoginFrequency', () => {
        it('counts login activity in the range with one repository read', async () => {
            analyticAuthRepository.countActivityByActions.mockResolvedValue(5);

            const result = await service.authLoginFrequency(startDate, endDate);

            expect(result).toEqual({ count: 5 });
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authLoginFrequency(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authLoginFrequency}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authLoginMethod', () => {
        it('maps the login-method groups into buckets and passes null dates through', async () => {
            const rows = [
                {
                    action: EnumActivityLogAction.userLoggedInWithCredential,
                    count: 7,
                },
            ];
            const buckets = [
                {
                    key: EnumActivityLogAction.userLoggedInWithCredential,
                    count: 7,
                },
            ];
            analyticAuthRepository.groupActivityByAction.mockResolvedValue(
                rows
            );

            const result = await service.authLoginMethod(null, null);

            expect(result).toEqual({ buckets });
            expect(
                analyticAuthRepository.groupActivityByAction
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.groupActivityByAction
            ).toHaveBeenCalledWith(UserLoginAnalyticActions, null, null);
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authLoginMethod(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authLoginMethod}:${startToken}:${endToken}`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authLockout', () => {
        it('splits one action group read into failed logins and max-attempt lockouts', async () => {
            analyticAuthRepository.groupActivityByAction.mockResolvedValue([
                { action: EnumActivityLogAction.userLoginFailed, count: 6 },
                {
                    action: EnumActivityLogAction.userMaxPasswordAttemptReached,
                    count: 2,
                },
                {
                    action: EnumActivityLogAction.userMaxMfaAttemptReached,
                    count: 1,
                },
            ]);

            const result = await service.authLockout(startDate, endDate);

            expect(result).toEqual({ failed: 6, maxAttempt: 3 });
            expect(
                analyticAuthRepository.groupActivityByAction
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.groupActivityByAction
            ).toHaveBeenCalledWith(
                [
                    EnumActivityLogAction.userLoginFailed,
                    EnumActivityLogAction.userMaxPasswordAttemptReached,
                    EnumActivityLogAction.userMaxMfaAttemptReached,
                ],
                startDate,
                endDate
            );
        });

        it('answers zero for an action the group read omits', async () => {
            analyticAuthRepository.groupActivityByAction.mockResolvedValue([]);

            const result = await service.authLockout(startDate, endDate);

            expect(result).toEqual({ failed: 0, maxAttempt: 0 });
        });

        it('reads through with the dashboard key, AnalyticLockoutMetricsCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authLockout(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authLockout}:${startToken}:${endToken}`,
                AnalyticLockoutMetricsCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authConcurrentSessions', () => {
        it('reads the stored buckets through the snapshot service with no cache', async () => {
            const stored = {
                buckets: [{ key: '1', count: 2 }],
                computedAt: now,
            };
            analyticSnapshotService.getBuckets.mockResolvedValue(stored);

            const result = await service.authConcurrentSessions();

            expect(result).toBe(stored);
            expect(analyticSnapshotService.getBuckets).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.concurrentSessions,
                AnalyticConcurrentSessionsSnapshotDataSchema
            );
            expect(cacheService.readThrough).not.toHaveBeenCalled();
        });
    });

    describe('computeConcurrentSessions', () => {
        it('turns the four repository buckets into a snapshot result without bucketing', async () => {
            const buckets = [
                { key: '1', count: 2 },
                { key: '2', count: 0 },
                { key: '3-5', count: 1 },
                { key: '6+', count: 0 },
            ];
            const snapshot = {
                items: [
                    {
                        key: '1',
                        value: 0,
                        occurredAt: null,
                        data: { key: '1', count: 2 },
                    },
                    {
                        key: '2',
                        value: 1,
                        occurredAt: null,
                        data: { key: '2', count: 0 },
                    },
                    {
                        key: '3-5',
                        value: 2,
                        occurredAt: null,
                        data: { key: '3-5', count: 1 },
                    },
                    {
                        key: '6+',
                        value: 3,
                        occurredAt: null,
                        data: { key: '6+', count: 0 },
                    },
                ],
                metadata: null,
                windowStart: null,
                windowEnd: null,
            };
            analyticAuthRepository.findConcurrentSessions.mockResolvedValue(
                buckets
            );

            const result = await service.computeConcurrentSessions();

            expect(result).toEqual(snapshot);
            expect(
                analyticAuthRepository.findConcurrentSessions
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.findConcurrentSessions
            ).toHaveBeenCalledWith(now, idleSince);
        });
    });

    describe('authSessionsUserAgent', () => {
        it('maps a null browser key to unknown and keeps a browser name', async () => {
            analyticAuthRepository.groupSessionsUserAgent.mockResolvedValue([
                { key: null, count: 1 },
                { key: 'Chrome', count: 4 },
            ]);

            const result = await service.authSessionsUserAgent(
                startDate,
                endDate
            );

            expect(result).toEqual({
                buckets: [
                    { key: EnumAnalyticGroupKey.unknown, count: 1 },
                    { key: 'Chrome', count: 4 },
                ],
            });
            expect(
                analyticAuthRepository.groupSessionsUserAgent
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.groupSessionsUserAgent
            ).toHaveBeenCalledWith(startDate, endDate, now, idleSince);
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authSessionsUserAgent(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authSessionsUa}:${startToken}:${endToken}`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authVerificationFunnel', () => {
        it('splits one grouped read into the email and mobile funnels', async () => {
            analyticAuthRepository.groupVerificationFunnel.mockResolvedValue([
                { type: EnumVerificationType.email, isUsed: true, count: 1 },
                { type: EnumVerificationType.email, isUsed: false, count: 2 },
                {
                    type: EnumVerificationType.mobileNumber,
                    isUsed: true,
                    count: 4,
                },
            ]);

            const result = await service.authVerificationFunnel(
                startDate,
                endDate
            );

            expect(result).toEqual({
                email: {
                    used: 1,
                    unused: 2,
                    total: 3,
                    rate: 33.33333333333333,
                },
                mobile: { used: 4, unused: 0, total: 4, rate: 100 },
            });
            expect(
                analyticAuthRepository.groupVerificationFunnel
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.groupVerificationFunnel
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('reads through with the dashboard key, AnalyticVerificationFunnelsCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authVerificationFunnel(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authVerificationFunnel}:${startToken}:${endToken}`,
                AnalyticVerificationFunnelsCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authPasswordChange', () => {
        it('counts profile password changes in the range with one repository read', async () => {
            analyticAuthRepository.countPasswordHistoryByType.mockResolvedValue(
                6
            );

            const result = await service.authPasswordChange(startDate, endDate);

            expect(result).toEqual({ count: 6 });
            expect(
                analyticAuthRepository.countPasswordHistoryByType
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.countPasswordHistoryByType
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.profile,
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authPasswordChange(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authPasswordChange}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authForgotPasswordConversion', () => {
        it('answers created, used, and the used share from one grouped read', async () => {
            analyticAuthRepository.groupForgotPasswordConversion.mockResolvedValue(
                [
                    { isUsed: true, count: 2 },
                    { isUsed: false, count: 3 },
                ]
            );

            const result = await service.authForgotPasswordConversion(
                startDate,
                endDate
            );

            expect(result).toEqual({ created: 5, used: 2, rate: 40 });
            expect(
                analyticAuthRepository.groupForgotPasswordConversion
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.groupForgotPasswordConversion
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('answers zero used when the grouped read holds no used tokens', async () => {
            analyticAuthRepository.groupForgotPasswordConversion.mockResolvedValue(
                [{ isUsed: false, count: 3 }]
            );

            const result = await service.authForgotPasswordConversion(
                startDate,
                endDate
            );

            expect(result).toEqual({ created: 3, used: 0, rate: 0 });
        });

        it('reads through with the dashboard key, AnalyticForgotPasswordConversionCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authForgotPasswordConversion(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authForgotConversion}:${startToken}:${endToken}`,
                AnalyticForgotPasswordConversionCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authMfaAdoption', () => {
        const computedAt = new Date('2026-03-01T00:00:00.000Z');

        it('answers the stored enabled and total mapped to a rate, with computedAt', async () => {
            const adoption = { enabled: 40, total: 200, rate: 20 };
            analyticSnapshotService.getSummary.mockResolvedValue({
                count: 0,
                metadata: { enabled: 40, total: 200 },
                windowStart: null,
                windowEnd: null,
                computedAt,
            });

            const result = await service.authMfaAdoption();

            expect(result).toEqual({ ...adoption, computedAt });
            expect(analyticSnapshotService.getSummary).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.mfaAdoption,
                AnalyticMfaAdoptionSnapshotMetaSchema
            );
            expect(
                analyticAuthRepository.findMfaAdoption
            ).not.toHaveBeenCalled();
            expect(cacheService.readThrough).not.toHaveBeenCalled();
        });

        it('maps zeros with a null computedAt before the first run', async () => {
            const adoption = { enabled: 0, total: 0, rate: 0 };
            analyticSnapshotService.getSummary.mockResolvedValue({
                count: 0,
                metadata: null,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
            });

            const result = await service.authMfaAdoption();

            expect(result).toEqual({ ...adoption, computedAt: null });
        });
    });

    describe('computeMfaAdoption', () => {
        it('returns no items and the repository counts as metadata', async () => {
            analyticAuthRepository.findMfaAdoption.mockResolvedValue({
                enabled: 3,
                total: 9,
            });

            const result = await service.computeMfaAdoption();

            expect(result).toEqual({
                items: [],
                metadata: { enabled: 3, total: 9 },
                windowStart: null,
                windowEnd: null,
            });
            expect(
                analyticAuthRepository.findMfaAdoption
            ).toHaveBeenCalledTimes(1);
        });
    });
});

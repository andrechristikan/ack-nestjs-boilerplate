import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Duration } from 'luxon';
import {
    EnumActivityLogAction,
    EnumAnalyticSnapshotSignal,
    EnumPasswordHistoryType,
    EnumUserLoginFrom,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticBucketsResultCacheSchema,
    AnalyticConcurrentSessionsSnapshotDataSchema,
    AnalyticForgotPasswordConversionCacheSchema,
    AnalyticLockoutMetricsCacheSchema,
    AnalyticMetricCountCacheSchema,
    AnalyticMfaAdoptionCacheSchema,
    AnalyticMfaAttemptSnapshotCacheSchema,
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

describe('AnalyticAuthService', () => {
    const dashboardTtlInMs = 1800000;
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
    const mfaUtil: MockProxy<MfaUtil> = mock<MfaUtil>();
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
    let service: AnalyticAuthService;

    beforeEach(async () => {
        vi.resetAllMocks();

        configService = buildConfigService({
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
        helperDateService.backward.mockReturnValue(idleSince);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAuthService,
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
                { provide: MfaUtil, useValue: mfaUtil },
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
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                Duration.fromMillis(idleTimeoutInMs)
            );
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
                { action: EnumActivityLogAction.userLoginCredential, count: 7 },
            ];
            const buckets = [
                { key: EnumActivityLogAction.userLoginCredential, count: 7 },
            ];
            analyticAuthRepository.groupActivityByAction.mockResolvedValue(
                rows
            );
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await service.authLoginMethod(null, null);

            expect(result).toEqual({ buckets });
            expect(
                analyticAuthRepository.groupActivityByAction
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.groupActivityByAction
            ).toHaveBeenCalledWith(UserLoginAnalyticActions, null, null);
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'action'
            );
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

    describe('authLoginSource', () => {
        it('returns the login-source groups as buckets with one repository read', async () => {
            const buckets = [{ key: EnumUserLoginFrom.website, count: 7 }];
            analyticAuthRepository.groupLoginSource.mockResolvedValue(buckets);

            const result = await service.authLoginSource(startDate, endDate);

            expect(result).toEqual({ buckets });
            expect(
                analyticAuthRepository.groupLoginSource
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.groupLoginSource
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authLoginSource(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authLoginSource}:${startToken}:${endToken}`,
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
                    action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                    count: 2,
                },
                {
                    action: EnumActivityLogAction.userReachMaxMfaAttempt,
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
                    EnumActivityLogAction.userReachMaxPasswordAttempt,
                    EnumActivityLogAction.userReachMaxMfaAttempt,
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

    describe('authSessionRevoke', () => {
        it('counts session revokes in the range with one repository read', async () => {
            analyticAuthRepository.countActivityByActions.mockResolvedValue(5);

            const result = await service.authSessionRevoke(startDate, endDate);

            expect(result).toEqual({ count: 5 });
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledWith(
                [
                    EnumActivityLogAction.userRevokeSession,
                    EnumActivityLogAction.userRevokeSessionByAdmin,
                    EnumActivityLogAction.userRevokeAllSessions,
                    EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                    EnumActivityLogAction.userRevokeSessionByDeviceLogin,
                ],
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authSessionRevoke(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authSessionRevoke}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
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
                items: [],
                metadata: null,
                windowStart: null,
                windowEnd: null,
            };
            analyticAuthRepository.findConcurrentSessions.mockResolvedValue(
                buckets
            );
            analyticBucketUtil.toBucketSnapshot.mockReturnValue(snapshot);

            const result = await service.computeConcurrentSessions();

            expect(result).toBe(snapshot);
            expect(
                analyticAuthRepository.findConcurrentSessions
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.findConcurrentSessions
            ).toHaveBeenCalledWith(now, idleSince);
            expect(analyticBucketUtil.toBucketSnapshot).toHaveBeenCalledWith(
                buckets
            );
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

    describe('authRefreshTokenVolume', () => {
        it('counts refresh-token activity in the range with one repository read', async () => {
            analyticAuthRepository.countActivityByActions.mockResolvedValue(5);

            const result = await service.authRefreshTokenVolume(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 5 });
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userRefreshToken],
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authRefreshTokenVolume(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authRefresh}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authLogoutRate', () => {
        it('counts logout activity in the range with one repository read', async () => {
            analyticAuthRepository.countActivityByActions.mockResolvedValue(5);

            const result = await service.authLogoutRate(startDate, endDate);

            expect(result).toEqual({ count: 5 });
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authLogoutRate(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authLogout}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
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
            helperNumberService.percent
                .mockReturnValueOnce(33)
                .mockReturnValueOnce(100);

            const result = await service.authVerificationFunnel(
                startDate,
                endDate
            );

            expect(result).toEqual({
                email: { used: 1, unused: 2, total: 3, rate: 33 },
                mobile: { used: 4, unused: 0, total: 4, rate: 100 },
            });
            expect(
                analyticAuthRepository.groupVerificationFunnel
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.groupVerificationFunnel
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(helperNumberService.percent).toHaveBeenNthCalledWith(
                1,
                1,
                3
            );
            expect(helperNumberService.percent).toHaveBeenNthCalledWith(
                2,
                4,
                4
            );
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
            helperNumberService.percent.mockReturnValue(40);

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
            expect(helperNumberService.percent).toHaveBeenCalledWith(2, 5);
        });

        it('answers zero used when the grouped read holds no used tokens', async () => {
            analyticAuthRepository.groupForgotPasswordConversion.mockResolvedValue(
                [{ isUsed: false, count: 3 }]
            );
            helperNumberService.percent.mockReturnValue(0);

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

    describe('authAdminForcePassword', () => {
        it('counts admin password changes in the range with one repository read', async () => {
            analyticAuthRepository.countPasswordHistoryByType.mockResolvedValue(
                6
            );

            const result = await service.authAdminForcePassword(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 6 });
            expect(
                analyticAuthRepository.countPasswordHistoryByType
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.countPasswordHistoryByType
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.admin,
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authAdminForcePassword(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authAdminForcePassword}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authMfaAdoption', () => {
        it('maps the one pipeline read into the adoption answer', async () => {
            const adoption = { enabled: 3, total: 9, rate: 33 };
            analyticAuthRepository.findMfaAdoption.mockResolvedValue({
                enabled: 3,
                total: 9,
            });
            mfaUtil.mapAdoption.mockReturnValue(adoption);

            const result = await service.authMfaAdoption();

            expect(result).toBe(adoption);
            expect(
                analyticAuthRepository.findMfaAdoption
            ).toHaveBeenCalledTimes(1);
            expect(mfaUtil.mapAdoption).toHaveBeenCalledWith(3, 9);
        });

        it('reads through with the dashboard key, AnalyticMfaAdoptionCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authMfaAdoption();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authMfaAdoption}:_:_`,
                AnalyticMfaAdoptionCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authMfaAdminReset', () => {
        it('counts admin mfa resets in the range with one repository read', async () => {
            analyticAuthRepository.countActivityByActions.mockResolvedValue(5);

            const result = await service.authMfaAdminReset(startDate, endDate);

            expect(result).toEqual({ count: 5 });
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userResetMfaByAdmin],
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authMfaAdminReset(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authMfaAdminReset}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authMfaVerifySuccess', () => {
        it('counts successful mfa verifications in the range with one repository read', async () => {
            analyticAuthRepository.countActivityByActions.mockResolvedValue(5);

            const result = await service.authMfaVerifySuccess(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 5 });
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userVerifyMfa],
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authMfaVerifySuccess(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authMfaVerify}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authBackupCodeRegeneration', () => {
        it('counts backup-code regenerations in the range with one repository read', async () => {
            analyticAuthRepository.countActivityByActions.mockResolvedValue(5);

            const result = await service.authBackupCodeRegeneration(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 5 });
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticAuthRepository.countActivityByActions
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userRegenerateMfaBackupCodes],
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authBackupCodeRegeneration(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authBackupCodeRegeneration}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authMfaAttempt', () => {
        it('returns the mfa attempt snapshot from one repository read', async () => {
            const snapshot = { usersWithAttempts: 2, totalAttempts: 5 };
            analyticAuthRepository.findMfaAttempt.mockResolvedValue(snapshot);

            const result = await service.authMfaAttempt();

            expect(result).toBe(snapshot);
            expect(analyticAuthRepository.findMfaAttempt).toHaveBeenCalledTimes(
                1
            );
        });

        it('reads through with the dashboard key, AnalyticMfaAttemptSnapshotCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authMfaAttempt();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authMfaAttempt}:_:_`,
                AnalyticMfaAttemptSnapshotCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });
});

import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Duration } from 'luxon';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumPasswordHistoryType,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { UserAgent } from '@generated/prisma-client/client';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticApiKeyActiveExpiredCacheSchema,
    AnalyticApiKeyLifecycleCacheSchema,
    AnalyticBlockedUsersCacheSchema,
    AnalyticBucketsResultCacheSchema,
    AnalyticForgotPasswordConversionCacheSchema,
    AnalyticLockoutMetricsCacheSchema,
    AnalyticMetricCountCacheSchema,
    AnalyticMetricRateCacheSchema,
    AnalyticMobileChurnCacheSchema,
    AnalyticProjectCountPageCacheSchema,
    AnalyticProjectCreationCacheSchema,
    AnalyticSessionDeviceRatioCacheSchema,
    AnalyticStatusCountsCacheSchema,
    AnalyticTermPolicyAcceptanceRateCacheSchema,
    AnalyticTermPolicyTimeToAcceptCacheSchema,
    AnalyticMfaAdoptionCacheSchema,
    AnalyticMfaAttemptSnapshotCacheSchema,
    AnalyticVerificationFunnelsCacheSchema,
    AnalyticWorkspaceCountPageCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { ApiKeyAnalyticService } from '@modules/api-key/services/api-key.analytic.service';
import { DeviceAnalyticService } from '@modules/device/services/device.analytic.service';
import { PasswordHistoryAnalyticService } from '@modules/password-history/services/password-history.analytic.service';
import { ProjectAnalyticService } from '@modules/project/services/project.analytic.service';
import { ProjectMemberAnalyticService } from '@modules/project/services/project.member.analytic.service';
import { SessionAnalyticService } from '@modules/session/services/session.analytic.service';
import { TermPolicyAcceptanceAnalyticService } from '@modules/term-policy/services/term-policy.acceptance.analytic.service';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { UserAnalyticService } from '@modules/user/services/user.analytic.service';
import { UserForgotPasswordAnalyticService } from '@modules/user/services/user.forgot-password.analytic.service';
import { UserMobileNumberAnalyticService } from '@modules/user/services/user.mobile-number.analytic.service';
import { MfaAnalyticService } from '@modules/mfa/services/mfa.analytic.service';
import { UserVerificationAnalyticService } from '@modules/user/services/user.verification.analytic.service';
import { WorkspaceAnalyticService } from '@modules/workspace/services/workspace.analytic.service';
import { WorkspaceInviteAnalyticService } from '@modules/workspace/services/workspace.invite.analytic.service';
import { WorkspaceJoinRequestAnalyticService } from '@modules/workspace/services/workspace.join-request.analytic.service';
import { WorkspaceMemberAnalyticService } from '@modules/workspace/services/workspace.member.analytic.service';
import { buildAnalyticSession } from '@test/unit/helpers/test.unit.analytic.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';

describe('AnalyticDashboardService', () => {
    const dashboardTtlInMs = 1800000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        dashboardTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const analyticBucketUtil: MockProxy<AnalyticBucketUtil> =
        mock<AnalyticBucketUtil>();
    const passwordHistoryAnalyticService: MockProxy<PasswordHistoryAnalyticService> =
        mock<PasswordHistoryAnalyticService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const userAnalyticService: MockProxy<UserAnalyticService> =
        mock<UserAnalyticService>();
    const userForgotPasswordAnalyticService: MockProxy<UserForgotPasswordAnalyticService> =
        mock<UserForgotPasswordAnalyticService>();
    const mfaAnalyticService: MockProxy<MfaAnalyticService> =
        mock<MfaAnalyticService>();
    const userVerificationAnalyticService: MockProxy<UserVerificationAnalyticService> =
        mock<UserVerificationAnalyticService>();
    const userMobileNumberAnalyticService: MockProxy<UserMobileNumberAnalyticService> =
        mock<UserMobileNumberAnalyticService>();
    const activityLogAnalyticService: MockProxy<ActivityLogAnalyticService> =
        mock<ActivityLogAnalyticService>();
    const sessionAnalyticService: MockProxy<SessionAnalyticService> =
        mock<SessionAnalyticService>();
    const deviceAnalyticService: MockProxy<DeviceAnalyticService> =
        mock<DeviceAnalyticService>();
    const apiKeyAnalyticService: MockProxy<ApiKeyAnalyticService> =
        mock<ApiKeyAnalyticService>();
    const termPolicyAcceptanceAnalyticService: MockProxy<TermPolicyAcceptanceAnalyticService> =
        mock<TermPolicyAcceptanceAnalyticService>();
    const workspaceAnalyticService: MockProxy<WorkspaceAnalyticService> =
        mock<WorkspaceAnalyticService>();
    const workspaceInviteAnalyticService: MockProxy<WorkspaceInviteAnalyticService> =
        mock<WorkspaceInviteAnalyticService>();
    const workspaceJoinRequestAnalyticService: MockProxy<WorkspaceJoinRequestAnalyticService> =
        mock<WorkspaceJoinRequestAnalyticService>();
    const workspaceMemberAnalyticService: MockProxy<WorkspaceMemberAnalyticService> =
        mock<WorkspaceMemberAnalyticService>();
    const projectAnalyticService: MockProxy<ProjectAnalyticService> =
        mock<ProjectAnalyticService>();
    const projectMemberAnalyticService: MockProxy<ProjectMemberAnalyticService> =
        mock<ProjectMemberAnalyticService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const startToken = '2026-01-01T00:00:00.000Z';
    const endToken = '2026-02-01T00:00:00.000Z';
    const now: Date = new Date('2026-03-01T00:00:00.000Z');
    const pagination = {
        skip: 0,
        limit: 20,
        orderBy: [],
    };
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [{ workspaceId: 'workspace-1', count: 3 }],
    };

    const cachedValue = { count: 99 };

    const inactivityInMs = 2592000000;

    let configService: MockProxy<ConfigService>;
    let service: AnalyticDashboardService;

    beforeEach(async () => {
        vi.resetAllMocks();

        configService = buildConfigService({
            'analytic.device.inactivityInMs': inactivityInMs,
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
        helperStringService.fillPattern.mockReturnValue('paged-token');
        helperDateService.create.mockReturnValue(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDashboardService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                { provide: ConfigService, useValue: configService },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                { provide: AnalyticBucketUtil, useValue: analyticBucketUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperStringService, useValue: helperStringService },
                {
                    provide: PasswordHistoryAnalyticService,
                    useValue: passwordHistoryAnalyticService,
                },
                { provide: UserAnalyticService, useValue: userAnalyticService },
                {
                    provide: UserForgotPasswordAnalyticService,
                    useValue: userForgotPasswordAnalyticService,
                },
                {
                    provide: MfaAnalyticService,
                    useValue: mfaAnalyticService,
                },
                {
                    provide: UserVerificationAnalyticService,
                    useValue: userVerificationAnalyticService,
                },
                {
                    provide: UserMobileNumberAnalyticService,
                    useValue: userMobileNumberAnalyticService,
                },
                {
                    provide: ActivityLogAnalyticService,
                    useValue: activityLogAnalyticService,
                },
                {
                    provide: SessionAnalyticService,
                    useValue: sessionAnalyticService,
                },
                {
                    provide: DeviceAnalyticService,
                    useValue: deviceAnalyticService,
                },
                {
                    provide: ApiKeyAnalyticService,
                    useValue: apiKeyAnalyticService,
                },
                {
                    provide: TermPolicyAcceptanceAnalyticService,
                    useValue: termPolicyAcceptanceAnalyticService,
                },
                {
                    provide: WorkspaceAnalyticService,
                    useValue: workspaceAnalyticService,
                },
                {
                    provide: WorkspaceInviteAnalyticService,
                    useValue: workspaceInviteAnalyticService,
                },
                {
                    provide: WorkspaceJoinRequestAnalyticService,
                    useValue: workspaceJoinRequestAnalyticService,
                },
                {
                    provide: WorkspaceMemberAnalyticService,
                    useValue: workspaceMemberAnalyticService,
                },
                {
                    provide: ProjectAnalyticService,
                    useValue: projectAnalyticService,
                },
                {
                    provide: ProjectMemberAnalyticService,
                    useValue: projectMemberAnalyticService,
                },
            ],
        }).compile();

        service = module.get(AnalyticDashboardService);
    });

    describe('usersRegistrations', () => {
        it('wraps the registration count on a cache miss', async () => {
            userAnalyticService.getCountRegistrations.mockResolvedValue(12);

            const result = await service.usersRegistrations(startDate, endDate);

            expect(result).toEqual({ count: 12 });
            expect(
                userAnalyticService.getCountRegistrations
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue({ count: 99 });

            const result = await service.usersRegistrations(startDate, endDate);

            expect(result).toEqual({ count: 99 });
            expect(
                userAnalyticService.getCountRegistrations
            ).not.toHaveBeenCalled();
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersRegistrations}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersChurn', () => {
        it('returns the churn rate from the user analytic domain', async () => {
            const rate = { count: 4, total: 10, rate: 0.4 };
            userAnalyticService.getChurnRate.mockResolvedValue(rate);

            const result = await service.usersChurn(startDate, endDate);

            expect(result).toEqual(rate);
            expect(userAnalyticService.getChurnRate).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricRateCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.usersChurn(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersChurn}:${startToken}:${endToken}`,
                AnalyticMetricRateCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersBlocked', () => {
        it('pairs the blocked trend with the standing blocked count', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                3
            );
            userAnalyticService.getCountByStatus.mockResolvedValue(5);

            const result = await service.usersBlocked(startDate, endDate);

            expect(result).toEqual({ trend: 3, current: 5 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userBlocked],
                startDate,
                endDate
            );
            expect(userAnalyticService.getCountByStatus).toHaveBeenCalledWith(
                EnumUserStatus.blocked
            );
        });

        it('reads through with the dashboard key, AnalyticBlockedUsersCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.usersBlocked(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersBlocked}:${startToken}:${endToken}`,
                AnalyticBlockedUsersCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersSignUpWith', () => {
        it('maps sign-up-with groups into counted buckets', async () => {
            const rows = [{ key: EnumUserSignUpWith.credential, count: 7 }];
            const buckets = [{ key: 'bucket-key', count: 7 }];
            userAnalyticService.getGroupBySignUpWith.mockResolvedValue(rows);
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await service.usersSignUpWith(startDate, endDate);

            expect(result).toEqual({ buckets });
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'key'
            );
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.usersSignUpWith(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersSignUpWith}:${startToken}:${endToken}`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersSignUpFrom', () => {
        it('maps sign-up-from groups into counted buckets', async () => {
            const rows = [{ key: EnumUserSignUpFrom.website, count: 7 }];
            const buckets = [{ key: 'bucket-key', count: 7 }];
            userAnalyticService.getGroupBySignUpFrom.mockResolvedValue(rows);
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await service.usersSignUpFrom(startDate, endDate);

            expect(result).toEqual({ buckets });
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'key'
            );
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.usersSignUpFrom(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersSignUpFrom}:${startToken}:${endToken}`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersEmailVerification', () => {
        it('returns the email verification rate', async () => {
            const rate = { count: 4, total: 10, rate: 0.4 };
            userAnalyticService.getEmailVerificationRate.mockResolvedValue(
                rate
            );

            const result = await service.usersEmailVerification(
                startDate,
                endDate
            );

            expect(result).toEqual(rate);
            expect(
                userAnalyticService.getEmailVerificationRate
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('reads through with the dashboard key, AnalyticMetricRateCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.usersEmailVerification(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersEmailVerification}:${startToken}:${endToken}`,
                AnalyticMetricRateCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersMobileVerification', () => {
        it('returns the mobile verification rate', async () => {
            const rate = { count: 4, total: 10, rate: 0.4 };
            userMobileNumberAnalyticService.getVerificationRate.mockResolvedValue(
                rate
            );

            const result = await service.usersMobileVerification(
                startDate,
                endDate
            );

            expect(result).toEqual(rate);
            expect(
                userMobileNumberAnalyticService.getVerificationRate
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('reads through with the dashboard key, AnalyticMetricRateCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.usersMobileVerification(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersMobileVerification}:${startToken}:${endToken}`,
                AnalyticMetricRateCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersStatusDistribution', () => {
        it('maps status groups into counted buckets', async () => {
            const rows = [{ key: EnumUserStatus.active, count: 8 }];
            const buckets = [{ key: 'bucket-key', count: 7 }];
            userAnalyticService.getGroupByStatus.mockResolvedValue(rows);
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await service.usersStatusDistribution();

            expect(result).toEqual({ buckets });
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'key'
            );
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.usersStatusDistribution();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersStatus}:_:_`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersCountryDistribution', () => {
        it('returns country buckets unchanged', async () => {
            const rows = [{ key: 'US', count: 4 }];
            userAnalyticService.getGroupByCountry.mockResolvedValue(rows);

            const result = await service.usersCountryDistribution();

            expect(result).toEqual({ buckets: rows });
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.usersCountryDistribution();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersCountry}:_:_`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersRoleDistribution', () => {
        it('returns role buckets unchanged', async () => {
            const rows = [{ key: 'admin', count: 2 }];
            userAnalyticService.getGroupByRole.mockResolvedValue(rows);

            const result = await service.usersRoleDistribution();

            expect(result).toEqual({ buckets: rows });
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.usersRoleDistribution();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersRole}:_:_`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersSelfDelete', () => {
        it('counts self-delete activity in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                3
            );

            const result = await service.usersSelfDelete(startDate, endDate);

            expect(result).toEqual({ count: 3 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userDeleteSelf],
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.usersSelfDelete(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersSelfDelete}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersClaimUsername', () => {
        it('counts username-claim activity in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                2
            );

            const result = await service.usersClaimUsername(startDate, endDate);

            expect(result).toEqual({ count: 2 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userClaimUsername],
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.usersClaimUsername(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersClaimUsername}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('usersMobileChurn', () => {
        it('counts added, updated, and deleted mobile numbers in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(3);

            const result = await service.usersMobileChurn(startDate, endDate);

            expect(result).toEqual({ added: 1, updated: 2, deleted: 3 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                [EnumActivityLogAction.userAddMobileNumber],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                [EnumActivityLogAction.userUpdateMobileNumber],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                3,
                [EnumActivityLogAction.userDeleteMobileNumber],
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMobileChurnCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.usersMobileChurn(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.usersMobileChurn}:${startToken}:${endToken}`,
                AnalyticMobileChurnCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authLoginFrequency', () => {
        it('wraps the login frequency count', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                12
            );

            const result = await service.authLoginFrequency(startDate, endDate);

            expect(result).toEqual({ count: 12 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
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
        it('maps login-method actions into buckets and nulls omitted dates', async () => {
            const rows = [
                { action: EnumActivityLogAction.userLoginCredential, count: 7 },
            ];
            const buckets = [
                { key: EnumActivityLogAction.userLoginCredential, count: 7 },
            ];
            activityLogAnalyticService.getGroupByActionInRange.mockResolvedValue(
                rows
            );
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await service.authLoginMethod(null, null);

            expect(result).toEqual({ buckets });
            expect(
                activityLogAnalyticService.getGroupByActionInRange
            ).toHaveBeenCalledWith(UserLoginAnalyticActions, null, null);
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'action'
            );
        });

        it('forwards present dates into the action group read', async () => {
            activityLogAnalyticService.getGroupByActionInRange.mockResolvedValue(
                []
            );
            analyticBucketUtil.toBuckets.mockReturnValue([]);

            await service.authLoginMethod(startDate, endDate);

            expect(
                activityLogAnalyticService.getGroupByActionInRange
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                startDate,
                endDate
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
        it('maps login-source groups into counted buckets under its own cache key', async () => {
            const rows = [{ key: EnumUserLoginFrom.website, count: 7 }];
            const buckets = [{ key: EnumUserLoginFrom.website, count: 7 }];
            userAnalyticService.getGroupLoginSource.mockResolvedValue(rows);
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await service.authLoginSource(startDate, endDate);

            expect(result).toEqual({ buckets });
            expect(
                userAnalyticService.getGroupLoginSource
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'key'
            );
            expect(
                activityLogAnalyticService.getGroupByActionInRange
            ).not.toHaveBeenCalled();
            expect(analyticCache.buildDashboardKey).toHaveBeenCalledWith(
                EnumAnalyticDashboardMetric.authLoginSource,
                startToken,
                endToken
            );
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
        it('counts failed logins and password and mfa max-attempt lockouts in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange
                .mockResolvedValueOnce(6)
                .mockResolvedValueOnce(3);

            const result = await service.authLockout(startDate, endDate);

            expect(result).toEqual({ failed: 6, maxAttempt: 3 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                [EnumActivityLogAction.userLoginFailed],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                [
                    EnumActivityLogAction.userReachMaxPasswordAttempt,
                    EnumActivityLogAction.userReachMaxMfaAttempt,
                ],
                startDate,
                endDate
            );
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
        it('counts every session-revoke activity in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                5
            );

            const result = await service.authSessionRevoke(startDate, endDate);

            expect(result).toEqual({ count: 5 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
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
        it('buckets active sessions per user by count range', async () => {
            const rows = [{ userId: 'user-1', count: 2 }];
            const buckets = [
                { key: '1', count: 0 },
                { key: '2', count: 1 },
                { key: '3-5', count: 0 },
                { key: '6+', count: 0 },
            ];
            sessionAnalyticService.getCountActiveByUser.mockResolvedValue(rows);

            const result = await service.authConcurrentSessions();

            expect(result).toEqual({ buckets });
            expect(
                sessionAnalyticService.getCountActiveByUser
            ).toHaveBeenCalledWith(now);
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authConcurrentSessions();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authConcurrent}:_:_`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authSessionsGeo', () => {
        it('returns session country buckets unchanged', async () => {
            const rows = [{ key: 'US', count: 4 }];
            sessionAnalyticService.getGroupByCountry.mockResolvedValue(rows);

            const result = await service.authSessionsGeo(startDate, endDate);

            expect(result).toEqual({ buckets: rows });
            expect(
                sessionAnalyticService.getGroupByCountry
            ).toHaveBeenCalledWith(startDate, endDate, now);
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.authSessionsGeo(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.authSessionsGeo}:${startToken}:${endToken}`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('authSessionsUserAgent', () => {
        const chrome: UserAgent = {
            ua: null,
            browser: {
                name: 'Chrome',
                version: null,
                major: null,
                type: null,
            },
            cpu: { architecture: null },
            device: { type: null, vendor: null, model: null },
            engine: { name: null, version: null },
            os: { name: null, version: null },
        };

        it('buckets the active sessions by browser', async () => {
            const sessions = [
                {
                    id: 'session-1',
                    userId: 'user-1',
                    ipAddress: null,
                    createdAt: startDate,
                    geoLocation: null,
                    userAgent: chrome,
                },
            ];
            const buckets = [{ key: 'Chrome', count: 1 }];
            sessionAnalyticService.getActiveInRange.mockResolvedValue(sessions);

            const result = await service.authSessionsUserAgent(
                startDate,
                endDate
            );

            expect(result).toEqual({ buckets });
            expect(
                sessionAnalyticService.getActiveInRange
            ).toHaveBeenCalledWith(startDate, endDate, now);
            expect(
                sessionAnalyticService.getActiveWithGeoInRange
            ).not.toHaveBeenCalled();
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
        it('counts refresh-token activity in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                8
            );

            const result = await service.authRefreshTokenVolume(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 8 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
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
        it('counts logout activity in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                4
            );

            const result = await service.authLogoutRate(startDate, endDate);

            expect(result).toEqual({ count: 4 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
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
        it('pairs email and mobile verification funnels', async () => {
            const email = { used: 1, unused: 2, total: 3, rate: 0.33 };
            const mobile = { used: 4, unused: 1, total: 5, rate: 0.8 };
            userVerificationAnalyticService.getFunnel
                .mockResolvedValueOnce(email)
                .mockResolvedValueOnce(mobile);

            const result = await service.authVerificationFunnel(
                startDate,
                endDate
            );

            expect(result).toEqual({ email, mobile });
            expect(
                userVerificationAnalyticService.getFunnel
            ).toHaveBeenNthCalledWith(
                1,
                EnumVerificationType.email,
                startDate,
                endDate
            );
            expect(
                userVerificationAnalyticService.getFunnel
            ).toHaveBeenNthCalledWith(
                2,
                EnumVerificationType.mobileNumber,
                startDate,
                endDate
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
        it('counts profile password-history changes in the range', async () => {
            passwordHistoryAnalyticService.getCountByTypeInRange.mockResolvedValue(
                6
            );

            const result = await service.authPasswordChange(startDate, endDate);

            expect(result).toEqual({ count: 6 });
            expect(
                passwordHistoryAnalyticService.getCountByTypeInRange
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
        it('returns forgot-password conversion', async () => {
            const conversion = { created: 5, used: 2, rate: 0.4 };
            userForgotPasswordAnalyticService.getConversion.mockResolvedValue(
                conversion
            );

            const result = await service.authForgotPasswordConversion(
                startDate,
                endDate
            );

            expect(result).toEqual(conversion);
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
        it('counts admin password-history changes in the range', async () => {
            passwordHistoryAnalyticService.getCountByTypeInRange.mockResolvedValue(
                1
            );

            const result = await service.authAdminForcePassword(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 1 });
            expect(
                passwordHistoryAnalyticService.getCountByTypeInRange
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
        it('reads the active and enabled counts together, then maps the adoption', async () => {
            const adoption = { enabled: 3, total: 9, rate: 0.33 };
            const deferredActive = buildDeferred<number>();
            userAnalyticService.getCountActive.mockReturnValue(
                deferredActive.promise
            );
            mfaAnalyticService.getEnabledCount.mockImplementation(async () => {
                deferredActive.resolve(9);

                return 3;
            });
            mfaAnalyticService.mapAdoption.mockReturnValue(adoption);

            const result = await service.authMfaAdoption();

            expect(result).toEqual(adoption);
            expect(mfaAnalyticService.mapAdoption).toHaveBeenCalledWith(3, 9);
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
        it('counts admin mfa resets in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                2
            );

            const result = await service.authMfaAdminReset(startDate, endDate);

            expect(result).toEqual({ count: 2 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
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
        it('counts successful mfa verifications in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                8
            );

            const result = await service.authMfaVerifySuccess(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 8 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
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
        it('counts backup-code regenerations in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                3
            );

            const result = await service.authBackupCodeRegeneration(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 3 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
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
        it('returns the mfa attempt snapshot', async () => {
            const snapshot = { usersWithAttempts: 2, totalAttempts: 5 };
            mfaAnalyticService.getAttemptSnapshot.mockResolvedValue(snapshot);

            const result = await service.authMfaAttempt();

            expect(result).toEqual(snapshot);
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

    describe('devicesRegistration', () => {
        it('wraps the device registration count', async () => {
            deviceAnalyticService.getCountRegistrations.mockResolvedValue(9);

            const result = await service.devicesRegistration(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 9 });
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.devicesRegistration(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesRegistration}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('devicesPlatform', () => {
        it('returns platform buckets unchanged', async () => {
            const rows = [{ key: 'ios', count: 4 }];
            deviceAnalyticService.getGroupByPlatform.mockResolvedValue(rows);

            const result = await service.devicesPlatform();

            expect(result).toEqual({ buckets: rows });
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.devicesPlatform();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesPlatform}:_:_`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('devicesPushToken', () => {
        it('returns the push-token rate', async () => {
            const rate = { count: 4, total: 10, rate: 0.4 };
            deviceAnalyticService.getPushTokenRate.mockResolvedValue(rate);

            const result = await service.devicesPushToken();

            expect(result).toEqual(rate);
        });

        it('reads through with the dashboard key, AnalyticMetricRateCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.devicesPushToken();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesPushToken}:_:_`,
                AnalyticMetricRateCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('devicesInfoRefresh', () => {
        it('counts device-refresh activity in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                7
            );

            const result = await service.devicesInfoRefresh(startDate, endDate);

            expect(result).toEqual({ count: 7 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userDeviceRefresh],
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.devicesInfoRefresh(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesInfoRefresh}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('devicesSessionRatio', () => {
        it('divides sessions by devices when devices exist', async () => {
            sessionAnalyticService.getCountActive.mockResolvedValue(10);
            deviceAnalyticService.getCountOwnerships.mockResolvedValue(5);

            const result = await service.devicesSessionRatio();

            expect(result).toEqual({ sessions: 10, devices: 5, ratio: 2 });
            expect(sessionAnalyticService.getCountActive).toHaveBeenCalledWith(
                now
            );
        });

        it('returns a zero ratio when no devices exist', async () => {
            sessionAnalyticService.getCountActive.mockResolvedValue(10);
            deviceAnalyticService.getCountOwnerships.mockResolvedValue(0);

            const result = await service.devicesSessionRatio();

            expect(result).toEqual({ sessions: 10, devices: 0, ratio: 0 });
        });

        it('reads through with the dashboard key, AnalyticSessionDeviceRatioCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.devicesSessionRatio();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesSessionRatio}:_:_`,
                AnalyticSessionDeviceRatioCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('devicesPerUser', () => {
        it('buckets per-user device counts by count range', async () => {
            const rows = [{ userId: 'user-1', count: 3 }];
            const buckets = [
                { key: '1', count: 0 },
                { key: '2', count: 0 },
                { key: '3-5', count: 1 },
                { key: '6+', count: 0 },
            ];
            deviceAnalyticService.getCountPerUser.mockResolvedValue(rows);

            const result = await service.devicesPerUser();

            expect(result).toEqual({ buckets });
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.devicesPerUser();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesPerUser}:_:_`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('devicesInactivity', () => {
        it('counts devices inactive for the configured inactivity window', async () => {
            const now = new Date('2026-03-01T00:00:00.000Z');
            const before = new Date('2026-01-30T00:00:00.000Z');
            helperDateService.create.mockReturnValue(now);
            helperDateService.backward.mockReturnValue(before);
            deviceAnalyticService.getCountInactive.mockResolvedValue(1);

            const result = await service.devicesInactivity();

            expect(result).toEqual({ count: 1 });
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                Duration.fromMillis(inactivityInMs)
            );
            expect(deviceAnalyticService.getCountInactive).toHaveBeenCalledWith(
                before
            );
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.devicesInactivity();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.devicesInactivity}:_:_`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('apiKeysLifecycle', () => {
        it('counts created, reset, updated, and deleted API key activity in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(3)
                .mockResolvedValueOnce(4);

            const result = await service.apiKeysLifecycle(startDate, endDate);

            expect(result).toEqual({
                created: 1,
                reset: 2,
                updated: 3,
                deleted: 4,
            });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                [EnumActivityLogAction.adminApiKeyCreate],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                [EnumActivityLogAction.adminApiKeyReset],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                3,
                [
                    EnumActivityLogAction.adminApiKeyUpdate,
                    EnumActivityLogAction.adminApiKeyUpdateDate,
                    EnumActivityLogAction.adminApiKeyUpdateStatus,
                ],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                4,
                [EnumActivityLogAction.adminApiKeyDelete],
                startDate,
                endDate
            );
        });

        it('reads through with the dashboard key, AnalyticApiKeyLifecycleCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.apiKeysLifecycle(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.apiKeysLifecycle}:${startToken}:${endToken}`,
                AnalyticApiKeyLifecycleCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('apiKeysActiveExpired', () => {
        it('returns active, expired, and inactive API key counts', async () => {
            const counts = { active: 6, expired: 1, inactive: 2 };
            apiKeyAnalyticService.getActiveExpired.mockResolvedValue(counts);

            const result = await service.apiKeysActiveExpired();

            expect(result).toEqual(counts);
            expect(apiKeyAnalyticService.getActiveExpired).toHaveBeenCalledWith(
                now
            );
        });

        it('reads through with the dashboard key, AnalyticApiKeyActiveExpiredCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.apiKeysActiveExpired();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.apiKeysActiveExpired}:_:_`,
                AnalyticApiKeyActiveExpiredCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('apiKeysTypeMix', () => {
        it('returns API key type buckets unchanged', async () => {
            const rows = [{ key: 'default', count: 4 }];
            apiKeyAnalyticService.getTypeMix.mockResolvedValue(rows);

            const result = await service.apiKeysTypeMix();

            expect(result).toEqual({ buckets: rows });
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.apiKeysTypeMix();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.apiKeysTypeMix}:_:_`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('termPoliciesAcceptanceRate', () => {
        it('reads the active user count first, then the acceptance rate with omitted dates as null', async () => {
            const rate = {
                acceptances: 4,
                users: 8,
                published: 2,
                rate: 0.5,
            };
            userAnalyticService.getCountActive.mockResolvedValue(8);
            termPolicyAcceptanceAnalyticService.getAcceptanceRate.mockResolvedValue(
                rate
            );

            const result = await service.termPoliciesAcceptanceRate(null, null);

            expect(result).toEqual(rate);
            expect(
                termPolicyAcceptanceAnalyticService.getAcceptanceRate
            ).toHaveBeenCalledWith(8, null, null);
        });

        it('forwards present dates into the rate read', async () => {
            userAnalyticService.getCountActive.mockResolvedValue(3);
            termPolicyAcceptanceAnalyticService.getAcceptanceRate.mockResolvedValue(
                { acceptances: 0, users: 3, published: 0, rate: 0 }
            );

            await service.termPoliciesAcceptanceRate(startDate, endDate);

            expect(
                termPolicyAcceptanceAnalyticService.getAcceptanceRate
            ).toHaveBeenCalledWith(3, startDate, endDate);
        });

        it('reads through with the dashboard key, AnalyticTermPolicyAcceptanceRateCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.termPoliciesAcceptanceRate(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.termPoliciesAcceptance}:${startToken}:${endToken}`,
                AnalyticTermPolicyAcceptanceRateCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('termPoliciesTimeToAccept', () => {
        it('nulls omitted dates before asking for time to accept', async () => {
            const timing = { count: 3, averageMs: 1500 };
            termPolicyAcceptanceAnalyticService.getTimeToAccept.mockResolvedValue(
                timing
            );

            const result = await service.termPoliciesTimeToAccept(null, null);

            expect(result).toEqual(timing);
            expect(
                termPolicyAcceptanceAnalyticService.getTimeToAccept
            ).toHaveBeenCalledWith(null, null);
        });

        it('reads through with the dashboard key, AnalyticTermPolicyTimeToAcceptCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.termPoliciesTimeToAccept(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.termPoliciesTimeToAccept}:${startToken}:${endToken}`,
                AnalyticTermPolicyTimeToAcceptCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('workspacesCreation', () => {
        it('wraps the workspace creation count', async () => {
            workspaceAnalyticService.getCountCreated.mockResolvedValue(4);

            const result = await service.workspacesCreation(startDate, endDate);

            expect(result).toEqual({ count: 4 });
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.workspacesCreation(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.workspacesCreation}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('workspacesVisibility', () => {
        it('returns visibility buckets unchanged', async () => {
            const rows = [{ key: 'private', count: 3 }];
            workspaceAnalyticService.getGroupByVisibility.mockResolvedValue(
                rows
            );

            const result = await service.workspacesVisibility();

            expect(result).toEqual({ buckets: rows });
        });

        it('reads through with the dashboard key, AnalyticBucketsResultCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.workspacesVisibility();

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.workspacesVisibility}:_:_`,
                AnalyticBucketsResultCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('workspacesInviteFunnel', () => {
        it('asks the invite domain with a null workspace id', async () => {
            const rows = [{ status: 'pending', count: 2 }];
            workspaceInviteAnalyticService.getFunnel.mockResolvedValue(rows);

            const result = await service.workspacesInviteFunnel(
                startDate,
                endDate
            );

            expect(result).toEqual(rows);
            expect(
                workspaceInviteAnalyticService.getFunnel
            ).toHaveBeenCalledWith(startDate, endDate, null);
        });

        it('reads through with the dashboard key, AnalyticStatusCountsCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.workspacesInviteFunnel(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.workspacesInviteFunnel}:${startToken}:${endToken}`,
                AnalyticStatusCountsCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('workspacesJoinOutcomes', () => {
        it('asks the join-request domain with a null workspace id', async () => {
            const rows = [{ status: 'approved', count: 1 }];
            workspaceJoinRequestAnalyticService.getOutcomes.mockResolvedValue(
                rows
            );

            const result = await service.workspacesJoinOutcomes(
                startDate,
                endDate
            );

            expect(result).toEqual(rows);
            expect(
                workspaceJoinRequestAnalyticService.getOutcomes
            ).toHaveBeenCalledWith(startDate, endDate, null);
        });

        it('reads through with the dashboard key, AnalyticStatusCountsCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.workspacesJoinOutcomes(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.workspacesJoinOutcomes}:${startToken}:${endToken}`,
                AnalyticStatusCountsCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('workspacesMembership', () => {
        it('caches membership pages by page token', async () => {
            workspaceMemberAnalyticService.getMembershipDistributionOffset.mockResolvedValue(
                offsetPage
            );

            const result = await service.workspacesMembership(pagination);

            expect(result).toEqual(offsetPage);
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{metric}:page={page}:perPage={perPage}',
                {
                    metric: EnumAnalyticDashboardMetric.workspacesMembership,
                    page: '1',
                    perPage: '20',
                }
            );
            expect(analyticCache.buildDashboardKey).toHaveBeenCalledWith(
                'paged-token',
                '_',
                '_'
            );
        });

        it('reads through with the dashboard key, AnalyticWorkspaceCountPageCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.workspacesMembership(pagination);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'paged-token:_:_',
                AnalyticWorkspaceCountPageCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('workspacesActivityVolume', () => {
        it('caches activity pages by page token and date range', async () => {
            activityLogAnalyticService.getGroupActivityByWorkspaceOffset.mockResolvedValue(
                offsetPage
            );

            const result = await service.workspacesActivityVolume(
                startDate,
                endDate,
                pagination
            );

            expect(result).toEqual(offsetPage);
            expect(
                activityLogAnalyticService.getGroupActivityByWorkspaceOffset
            ).toHaveBeenCalledWith(startDate, endDate, pagination);
        });

        it('reads through with the dashboard key, AnalyticWorkspaceCountPageCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.workspacesActivityVolume(
                startDate,
                endDate,
                pagination
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `paged-token:${startToken}:${endToken}`,
                AnalyticWorkspaceCountPageCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('projectsCreation', () => {
        it('returns project creation counts', async () => {
            const creation = {
                created: 2,
                perWorkspace: [{ workspaceId: 'workspace-1', count: 2 }],
            };
            projectAnalyticService.getCreation.mockResolvedValue(creation);

            const result = await service.projectsCreation(startDate, endDate);

            expect(result).toEqual(creation);
        });

        it('reads through with the dashboard key, AnalyticProjectCreationCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.projectsCreation(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.projectsCreation}:${startToken}:${endToken}`,
                AnalyticProjectCreationCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('projectsMembership', () => {
        it('caches project membership pages by page token', async () => {
            const page = {
                ...offsetPage,
                data: [{ projectId: 'project-1', count: 4 }],
            };
            projectMemberAnalyticService.getMembershipDistributionOffset.mockResolvedValue(
                page
            );

            const result = await service.projectsMembership(pagination);

            expect(result).toEqual(page);
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{metric}:page={page}:perPage={perPage}',
                {
                    metric: EnumAnalyticDashboardMetric.projectsMembership,
                    page: '1',
                    perPage: '20',
                }
            );
            expect(analyticCache.buildDashboardKey).toHaveBeenCalledWith(
                'paged-token',
                '_',
                '_'
            );
        });

        it('reads through with the dashboard key, AnalyticProjectCountPageCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.projectsMembership(pagination);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'paged-token:_:_',
                AnalyticProjectCountPageCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('pagedMetricToken', () => {
        it('fills the paged metric pattern with the one-based page and the page size', () => {
            const result = service['pagedMetricToken'](
                EnumAnalyticDashboardMetric.workspacesMembership,
                20,
                10
            );

            expect(result).toBe('paged-token');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{metric}:page={page}:perPage={perPage}',
                {
                    metric: EnumAnalyticDashboardMetric.workspacesMembership,
                    page: '3',
                    perPage: '10',
                }
            );
        });
    });

    describe('toBucketsByBrowser', () => {
        const createdAt = new Date('2026-01-01T00:00:00.000Z');
        const emptyAgent: UserAgent = {
            ua: null,
            browser: null,
            cpu: { architecture: null },
            device: { type: null, vendor: null, model: null },
            engine: { name: null, version: null },
            os: { name: null, version: null },
        };
        const chrome: UserAgent = {
            ...emptyAgent,
            browser: { name: 'Chrome', version: null, major: null, type: null },
        };
        const ios: UserAgent = {
            ...emptyAgent,
            os: { name: 'iOS', version: null },
        };

        it('counts sessions by browser, then os, then unknown, in first-seen order', () => {
            const sessions = [
                buildAnalyticSession('1', 'user-1', createdAt, null, chrome),
                buildAnalyticSession('2', 'user-2', createdAt, null, chrome),
                buildAnalyticSession('3', 'user-3', createdAt, null, ios),
                buildAnalyticSession(
                    '4',
                    'user-4',
                    createdAt,
                    null,
                    emptyAgent
                ),
            ];

            expect(service['toBucketsByBrowser'](sessions)).toEqual([
                { key: 'Chrome', count: 2 },
                { key: 'iOS', count: 1 },
                { key: 'unknown', count: 1 },
            ]);
        });

        it('returns an empty list for no sessions', () => {
            expect(service['toBucketsByBrowser']([])).toEqual([]);
        });
    });

    describe('toBucketsByCountRange', () => {
        it('counts each row into the range holding its count and keeps empty ranges', () => {
            const rows = [
                { userId: 'user-1', count: 1 },
                { userId: 'user-2', count: 1 },
                { userId: 'user-3', count: 2 },
                { userId: 'user-4', count: 3 },
                { userId: 'user-5', count: 5 },
                { userId: 'user-6', count: 6 },
                { userId: 'user-7', count: 40 },
            ];

            expect(service['toBucketsByCountRange'](rows)).toEqual([
                { key: '1', count: 2 },
                { key: '2', count: 1 },
                { key: '3-5', count: 2 },
                { key: '6+', count: 2 },
            ]);
        });

        it('returns every range with a zero count for no rows', () => {
            expect(service['toBucketsByCountRange']([])).toEqual([
                { key: '1', count: 0 },
                { key: '2', count: 0 },
                { key: '3-5', count: 0 },
                { key: '6+', count: 0 },
            ]);
        });

        it('ignores a row whose count is below every range', () => {
            expect(
                service['toBucketsByCountRange']([
                    { userId: 'user-1', count: 0 },
                ])
            ).toEqual([
                { key: '1', count: 0 },
                { key: '2', count: 0 },
                { key: '3-5', count: 0 },
                { key: '6+', count: 0 },
            ]);
        });
    });

    describe('dashboardKey', () => {
        it('builds the dashboard key from the metric and both date tokens', () => {
            const result = service['dashboardKey'](
                EnumAnalyticDashboardMetric.usersRegistrations,
                startDate,
                endDate
            );

            expect(result).toBe(
                `${EnumAnalyticDashboardMetric.usersRegistrations}:${startToken}:${endToken}`
            );
            expect(analyticDateUtil.cacheToken).toHaveBeenCalledWith(startDate);
            expect(analyticDateUtil.cacheToken).toHaveBeenCalledWith(endDate);
            expect(analyticCache.buildDashboardKey).toHaveBeenCalledWith(
                EnumAnalyticDashboardMetric.usersRegistrations,
                startToken,
                endToken
            );
        });

        it('builds the empty tokens for null dates', () => {
            const result = service['dashboardKey'](
                EnumAnalyticDashboardMetric.usersStatus,
                null,
                null
            );

            expect(result).toBe(
                `${EnumAnalyticDashboardMetric.usersStatus}:_:_`
            );
            expect(analyticDateUtil.cacheToken).toHaveBeenCalledWith(null);
        });
    });
});

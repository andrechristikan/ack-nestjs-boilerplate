import { HelperDateService } from '@common/helper/services/helper.date.service';
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
import { UserPasswordAnalyticService } from '@modules/user/services/user.password.analytic.service';
import { UserTwoFactorAnalyticService } from '@modules/user/services/user.two-factor.analytic.service';
import { UserVerificationAnalyticService } from '@modules/user/services/user.verification.analytic.service';
import { WorkspaceAnalyticService } from '@modules/workspace/services/workspace.analytic.service';
import { WorkspaceInviteAnalyticService } from '@modules/workspace/services/workspace.invite.analytic.service';
import { WorkspaceJoinRequestAnalyticService } from '@modules/workspace/services/workspace.join-request.analytic.service';
import { WorkspaceMemberAnalyticService } from '@modules/workspace/services/workspace.member.analytic.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';

describe('AnalyticDashboardService', () => {
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const analyticBucketUtil: MockProxy<AnalyticBucketUtil> =
        mock<AnalyticBucketUtil>();
    const passwordHistoryAnalyticService: MockProxy<PasswordHistoryAnalyticService> =
        mock<PasswordHistoryAnalyticService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const userAnalyticService: MockProxy<UserAnalyticService> =
        mock<UserAnalyticService>();
    const userPasswordAnalyticService: MockProxy<UserPasswordAnalyticService> =
        mock<UserPasswordAnalyticService>();
    const userForgotPasswordAnalyticService: MockProxy<UserForgotPasswordAnalyticService> =
        mock<UserForgotPasswordAnalyticService>();
    const userTwoFactorAnalyticService: MockProxy<UserTwoFactorAnalyticService> =
        mock<UserTwoFactorAnalyticService>();
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
        analyticCache.getDashboard.mockResolvedValue(null);
        analyticDateUtil.pagedMetricToken.mockReturnValue('paged-token');
        helperDateService.create.mockReturnValue(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDashboardService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: ConfigService, useValue: configService },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                { provide: AnalyticBucketUtil, useValue: analyticBucketUtil },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: PasswordHistoryAnalyticService,
                    useValue: passwordHistoryAnalyticService,
                },
                { provide: UserAnalyticService, useValue: userAnalyticService },
                {
                    provide: UserPasswordAnalyticService,
                    useValue: userPasswordAnalyticService,
                },
                {
                    provide: UserForgotPasswordAnalyticService,
                    useValue: userForgotPasswordAnalyticService,
                },
                {
                    provide: UserTwoFactorAnalyticService,
                    useValue: userTwoFactorAnalyticService,
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
            expect(analyticCache.setDashboard).toHaveBeenCalledWith(
                'users.registrations',
                startDate.toISOString(),
                endDate.toISOString(),
                { count: 12 }
            );
        });

        it('returns the cached value without computing or storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue({ count: 99 });

            const result = await service.usersRegistrations(startDate, endDate);

            expect(result).toEqual({ count: 99 });
            expect(
                userAnalyticService.getCountRegistrations
            ).not.toHaveBeenCalled();
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.usersChurn(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.usersBlocked(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.usersSignUpWith(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.usersSignUpFrom(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.usersEmailVerification(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.usersMobileVerification(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.usersStatusDistribution();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('usersCountryDistribution', () => {
        it('returns country buckets unchanged', async () => {
            const rows = [{ key: 'US', count: 4 }];
            userAnalyticService.getGroupByCountry.mockResolvedValue(rows);

            const result = await service.usersCountryDistribution();

            expect(result).toEqual({ buckets: rows });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.usersCountryDistribution();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('usersRoleDistribution', () => {
        it('returns role buckets unchanged', async () => {
            const rows = [{ key: 'admin', count: 2 }];
            userAnalyticService.getGroupByRole.mockResolvedValue(rows);

            const result = await service.usersRoleDistribution();

            expect(result).toEqual({ buckets: rows });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.usersRoleDistribution();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.usersSelfDelete(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.usersClaimUsername(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.usersMobileChurn(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authLoginFrequency(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authLoginMethod(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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
            expect(analyticCache.setDashboard).toHaveBeenCalledWith(
                EnumAnalyticDashboardMetric.authLoginSource,
                startDate.toISOString(),
                endDate.toISOString(),
                result
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authLoginSource(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authLockout', () => {
        it('counts failed logins and password and two-factor max-attempt lockouts in the range', async () => {
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
                    EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                ],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authLockout(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authSessionRevoke(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authConcurrentSessions', () => {
        it('buckets active sessions per user by count range', async () => {
            const rows = [{ userId: 'user-1', count: 2 }];
            const buckets = [{ key: '2', count: 1 }];
            sessionAnalyticService.getCountActiveByUser.mockResolvedValue(rows);
            analyticBucketUtil.toBucketsByCountRange.mockReturnValue(buckets);

            const result = await service.authConcurrentSessions();

            expect(result).toEqual({ buckets });
            expect(
                sessionAnalyticService.getCountActiveByUser
            ).toHaveBeenCalledWith(now);
            expect(
                analyticBucketUtil.toBucketsByCountRange
            ).toHaveBeenCalledWith(rows);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authConcurrentSessions();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authSessionsGeo(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('buckets the active sessions by browser through the bucket util', async () => {
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
            analyticBucketUtil.toBucketsByBrowser.mockReturnValue(buckets);

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
            expect(analyticBucketUtil.toBucketsByBrowser).toHaveBeenCalledWith(
                sessions
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authSessionsUserAgent(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authRefreshTokenVolume(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authLogoutRate(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authVerificationFunnel(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authPasswordExpiry', () => {
        it('reads the active and expired counts together, then maps the compliance', async () => {
            const expiry = {
                expired: 2,
                total: 10,
                compliant: 8,
                rate: 0.8,
            };
            const deferredActive = buildDeferred<number>();
            userAnalyticService.getCountActive.mockReturnValue(
                deferredActive.promise
            );
            userPasswordAnalyticService.getExpiredCount.mockImplementation(
                async () => {
                    deferredActive.resolve(10);

                    return 2;
                }
            );
            userPasswordAnalyticService.mapExpiryCompliance.mockReturnValue(
                expiry
            );

            const result = await service.authPasswordExpiry();

            expect(result).toEqual(expiry);
            expect(
                userPasswordAnalyticService.mapExpiryCompliance
            ).toHaveBeenCalledWith(2, 10);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authPasswordExpiry();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authPasswordChange(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authForgotPasswordConversion(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authAdminForcePassword(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authTwoFactorAdoption', () => {
        it('reads the active and enabled counts together, then maps the adoption', async () => {
            const adoption = { enabled: 3, total: 9, rate: 0.33 };
            const deferredActive = buildDeferred<number>();
            userAnalyticService.getCountActive.mockReturnValue(
                deferredActive.promise
            );
            userTwoFactorAnalyticService.getEnabledCount.mockImplementation(
                async () => {
                    deferredActive.resolve(9);

                    return 3;
                }
            );
            userTwoFactorAnalyticService.mapAdoption.mockReturnValue(adoption);

            const result = await service.authTwoFactorAdoption();

            expect(result).toEqual(adoption);
            expect(
                userTwoFactorAnalyticService.mapAdoption
            ).toHaveBeenCalledWith(3, 9);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authTwoFactorAdoption();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authTwoFactorAdminReset', () => {
        it('counts admin two-factor resets in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                2
            );

            const result = await service.authTwoFactorAdminReset(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 2 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userResetTwoFactorByAdmin],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authTwoFactorAdminReset(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authTwoFactorVerifySuccess', () => {
        it('counts successful two-factor verifications in the range', async () => {
            activityLogAnalyticService.getCountByActionsInRange.mockResolvedValue(
                8
            );

            const result = await service.authTwoFactorVerifySuccess(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 8 });
            expect(
                activityLogAnalyticService.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userVerifyTwoFactor],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authTwoFactorVerifySuccess(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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
                [EnumActivityLogAction.userRegenerateTwoFactorBackupCodes],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authBackupCodeRegeneration(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authTwoFactorAttempt', () => {
        it('returns the two-factor attempt snapshot', async () => {
            const snapshot = { usersWithAttempts: 2, totalAttempts: 5 };
            userTwoFactorAnalyticService.getAttemptSnapshot.mockResolvedValue(
                snapshot
            );

            const result = await service.authTwoFactorAttempt();

            expect(result).toEqual(snapshot);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.authTwoFactorAttempt();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.devicesRegistration(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('devicesPlatform', () => {
        it('returns platform buckets unchanged', async () => {
            const rows = [{ key: 'ios', count: 4 }];
            deviceAnalyticService.getGroupByPlatform.mockResolvedValue(rows);

            const result = await service.devicesPlatform();

            expect(result).toEqual({ buckets: rows });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.devicesPlatform();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('devicesPushToken', () => {
        it('returns the push-token rate', async () => {
            const rate = { count: 4, total: 10, rate: 0.4 };
            deviceAnalyticService.getPushTokenRate.mockResolvedValue(rate);

            const result = await service.devicesPushToken();

            expect(result).toEqual(rate);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.devicesPushToken();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.devicesInfoRefresh(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.devicesSessionRatio();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('devicesPerUser', () => {
        it('buckets per-user device counts by count range', async () => {
            const rows = [{ userId: 'user-1', count: 3 }];
            const buckets = [{ key: '3-5', count: 1 }];
            deviceAnalyticService.getCountPerUser.mockResolvedValue(rows);
            analyticBucketUtil.toBucketsByCountRange.mockReturnValue(buckets);

            const result = await service.devicesPerUser();

            expect(result).toEqual({ buckets });
            expect(
                analyticBucketUtil.toBucketsByCountRange
            ).toHaveBeenCalledWith(rows);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.devicesPerUser();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.devicesInactivity();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.apiKeysLifecycle(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.apiKeysActiveExpired();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('apiKeysTypeMix', () => {
        it('returns API key type buckets unchanged', async () => {
            const rows = [{ key: 'default', count: 4 }];
            apiKeyAnalyticService.getTypeMix.mockResolvedValue(rows);

            const result = await service.apiKeysTypeMix();

            expect(result).toEqual({ buckets: rows });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.apiKeysTypeMix();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.termPoliciesAcceptanceRate(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.termPoliciesTimeToAccept(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('workspacesCreation', () => {
        it('wraps the workspace creation count', async () => {
            workspaceAnalyticService.getCountCreated.mockResolvedValue(4);

            const result = await service.workspacesCreation(startDate, endDate);

            expect(result).toEqual({ count: 4 });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.workspacesCreation(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.workspacesVisibility();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.workspacesInviteFunnel(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.workspacesJoinOutcomes(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('workspacesMembership', () => {
        it('caches membership pages by page token', async () => {
            workspaceMemberAnalyticService.getMembershipDistributionOffset.mockResolvedValue(
                offsetPage
            );

            const result = await service.workspacesMembership(pagination);

            expect(result).toEqual(offsetPage);
            expect(analyticDateUtil.pagedMetricToken).toHaveBeenCalledWith(
                EnumAnalyticDashboardMetric.workspacesMembership,
                0,
                20
            );
            expect(analyticCache.getDashboard).toHaveBeenCalledWith(
                'paged-token',
                '_',
                '_'
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.workspacesMembership(pagination);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.workspacesActivityVolume(
                startDate,
                endDate,
                pagination
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.projectsCreation(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
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
            expect(analyticDateUtil.pagedMetricToken).toHaveBeenCalledWith(
                EnumAnalyticDashboardMetric.projectsMembership,
                0,
                20
            );
            expect(analyticCache.getDashboard).toHaveBeenCalledWith(
                'paged-token',
                '_',
                '_'
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await service.projectsMembership(pagination);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('readCache', () => {
        it('returns the stored value read under the date tokens', async () => {
            const stored = { count: 99 };
            analyticCache.getDashboard.mockResolvedValue(stored);

            const result = await service['readCache'](
                'users.registrations',
                startDate,
                endDate
            );

            expect(result).toEqual(stored);
            expect(analyticCache.getDashboard).toHaveBeenCalledWith(
                'users.registrations',
                startDate.toISOString(),
                endDate.toISOString()
            );
        });

        it('returns null on a cache miss', async () => {
            const result = await service['readCache'](
                'users.registrations',
                startDate,
                endDate
            );

            expect(result).toBeNull();
        });
    });

    describe('writeCache', () => {
        it('stores the value under the date tokens', async () => {
            await service['writeCache'](
                'users.registrations',
                startDate,
                endDate,
                { count: 1 }
            );

            expect(analyticCache.setDashboard).toHaveBeenCalledWith(
                'users.registrations',
                startDate.toISOString(),
                endDate.toISOString(),
                { count: 1 }
            );
        });
    });
});

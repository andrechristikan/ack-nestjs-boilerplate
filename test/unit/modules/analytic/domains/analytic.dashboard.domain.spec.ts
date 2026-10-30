import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
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
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticDashboardDomain } from '@modules/analytic/domains/analytic.dashboard.domain';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { ApiKeyAnalyticDomain } from '@modules/api-key/domains/api-key.analytic.domain';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { PasswordHistoryAnalyticDomain } from '@modules/password-history/domains/password-history.analytic.domain';
import { ProjectAnalyticDomain } from '@modules/project/domains/project.analytic.domain';
import { ProjectMemberAnalyticDomain } from '@modules/project/domains/project.member.analytic.domain';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';
import { TermPolicyAcceptanceAnalyticDomain } from '@modules/term-policy/domains/term-policy.acceptance.analytic.domain';
import { UserLoginAnalyticActions } from '@modules/user/constants/user.constant';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserForgotPasswordAnalyticDomain } from '@modules/user/domains/user.forgot-password.analytic.domain';
import { UserMobileNumberAnalyticDomain } from '@modules/user/domains/user.mobile-number.analytic.domain';
import { UserPasswordAnalyticDomain } from '@modules/user/domains/user.password.analytic.domain';
import { UserTwoFactorAnalyticDomain } from '@modules/user/domains/user.two-factor.analytic.domain';
import { UserVerificationAnalyticDomain } from '@modules/user/domains/user.verification.analytic.domain';
import { WorkspaceAnalyticDomain } from '@modules/workspace/domains/workspace.analytic.domain';
import { WorkspaceInviteAnalyticDomain } from '@modules/workspace/domains/workspace.invite.analytic.domain';
import { WorkspaceJoinRequestAnalyticDomain } from '@modules/workspace/domains/workspace.join-request.analytic.domain';
import { WorkspaceMemberAnalyticDomain } from '@modules/workspace/domains/workspace.member.analytic.domain';

describe('AnalyticDashboardDomain', () => {
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const analyticBucketUtil: MockProxy<AnalyticBucketUtil> =
        mock<AnalyticBucketUtil>();
    const passwordHistoryAnalyticDomain: MockProxy<PasswordHistoryAnalyticDomain> =
        mock<PasswordHistoryAnalyticDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const userAnalyticDomain: MockProxy<UserAnalyticDomain> =
        mock<UserAnalyticDomain>();
    const userPasswordAnalyticDomain: MockProxy<UserPasswordAnalyticDomain> =
        mock<UserPasswordAnalyticDomain>();
    const userForgotPasswordAnalyticDomain: MockProxy<UserForgotPasswordAnalyticDomain> =
        mock<UserForgotPasswordAnalyticDomain>();
    const userTwoFactorAnalyticDomain: MockProxy<UserTwoFactorAnalyticDomain> =
        mock<UserTwoFactorAnalyticDomain>();
    const userVerificationAnalyticDomain: MockProxy<UserVerificationAnalyticDomain> =
        mock<UserVerificationAnalyticDomain>();
    const userMobileNumberAnalyticDomain: MockProxy<UserMobileNumberAnalyticDomain> =
        mock<UserMobileNumberAnalyticDomain>();
    const activityLogAnalyticDomain: MockProxy<ActivityLogAnalyticDomain> =
        mock<ActivityLogAnalyticDomain>();
    const sessionAnalyticDomain: MockProxy<SessionAnalyticDomain> =
        mock<SessionAnalyticDomain>();
    const deviceAnalyticDomain: MockProxy<DeviceAnalyticDomain> =
        mock<DeviceAnalyticDomain>();
    const apiKeyAnalyticDomain: MockProxy<ApiKeyAnalyticDomain> =
        mock<ApiKeyAnalyticDomain>();
    const termPolicyAcceptanceAnalyticDomain: MockProxy<TermPolicyAcceptanceAnalyticDomain> =
        mock<TermPolicyAcceptanceAnalyticDomain>();
    const workspaceAnalyticDomain: MockProxy<WorkspaceAnalyticDomain> =
        mock<WorkspaceAnalyticDomain>();
    const workspaceInviteAnalyticDomain: MockProxy<WorkspaceInviteAnalyticDomain> =
        mock<WorkspaceInviteAnalyticDomain>();
    const workspaceJoinRequestAnalyticDomain: MockProxy<WorkspaceJoinRequestAnalyticDomain> =
        mock<WorkspaceJoinRequestAnalyticDomain>();
    const workspaceMemberAnalyticDomain: MockProxy<WorkspaceMemberAnalyticDomain> =
        mock<WorkspaceMemberAnalyticDomain>();
    const projectAnalyticDomain: MockProxy<ProjectAnalyticDomain> =
        mock<ProjectAnalyticDomain>();
    const projectMemberAnalyticDomain: MockProxy<ProjectMemberAnalyticDomain> =
        mock<ProjectMemberAnalyticDomain>();

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

    let domain: AnalyticDashboardDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        analyticDateUtil.cacheToken.mockImplementation((date: Date | null) =>
            date ? date.toISOString() : '_'
        );
        analyticCache.getDashboard.mockResolvedValue(null);
        analyticDateUtil.pagedMetricToken.mockReturnValue('paged-token');
        helperDateService.create.mockReturnValue(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDashboardDomain,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                { provide: AnalyticBucketUtil, useValue: analyticBucketUtil },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: PasswordHistoryAnalyticDomain,
                    useValue: passwordHistoryAnalyticDomain,
                },
                { provide: UserAnalyticDomain, useValue: userAnalyticDomain },
                {
                    provide: UserPasswordAnalyticDomain,
                    useValue: userPasswordAnalyticDomain,
                },
                {
                    provide: UserForgotPasswordAnalyticDomain,
                    useValue: userForgotPasswordAnalyticDomain,
                },
                {
                    provide: UserTwoFactorAnalyticDomain,
                    useValue: userTwoFactorAnalyticDomain,
                },
                {
                    provide: UserVerificationAnalyticDomain,
                    useValue: userVerificationAnalyticDomain,
                },
                {
                    provide: UserMobileNumberAnalyticDomain,
                    useValue: userMobileNumberAnalyticDomain,
                },
                {
                    provide: ActivityLogAnalyticDomain,
                    useValue: activityLogAnalyticDomain,
                },
                {
                    provide: SessionAnalyticDomain,
                    useValue: sessionAnalyticDomain,
                },
                {
                    provide: DeviceAnalyticDomain,
                    useValue: deviceAnalyticDomain,
                },
                {
                    provide: ApiKeyAnalyticDomain,
                    useValue: apiKeyAnalyticDomain,
                },
                {
                    provide: TermPolicyAcceptanceAnalyticDomain,
                    useValue: termPolicyAcceptanceAnalyticDomain,
                },
                {
                    provide: WorkspaceAnalyticDomain,
                    useValue: workspaceAnalyticDomain,
                },
                {
                    provide: WorkspaceInviteAnalyticDomain,
                    useValue: workspaceInviteAnalyticDomain,
                },
                {
                    provide: WorkspaceJoinRequestAnalyticDomain,
                    useValue: workspaceJoinRequestAnalyticDomain,
                },
                {
                    provide: WorkspaceMemberAnalyticDomain,
                    useValue: workspaceMemberAnalyticDomain,
                },
                {
                    provide: ProjectAnalyticDomain,
                    useValue: projectAnalyticDomain,
                },
                {
                    provide: ProjectMemberAnalyticDomain,
                    useValue: projectMemberAnalyticDomain,
                },
            ],
        }).compile();

        domain = module.get(AnalyticDashboardDomain);
    });

    describe('usersRegistrations', () => {
        it('wraps the registration count on a cache miss', async () => {
            userAnalyticDomain.getCountRegistrations.mockResolvedValue(12);

            const result = await domain.usersRegistrations(startDate, endDate);

            expect(result).toEqual({ count: 12 });
            expect(
                userAnalyticDomain.getCountRegistrations
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

            const result = await domain.usersRegistrations(startDate, endDate);

            expect(result).toEqual({ count: 99 });
            expect(
                userAnalyticDomain.getCountRegistrations
            ).not.toHaveBeenCalled();
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('usersChurn', () => {
        it('returns the churn rate from the user analytic domain', async () => {
            const rate = { count: 4, total: 10, rate: 0.4 };
            userAnalyticDomain.getChurnRate.mockResolvedValue(rate);

            const result = await domain.usersChurn(startDate, endDate);

            expect(result).toEqual(rate);
            expect(userAnalyticDomain.getChurnRate).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.usersChurn(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('usersBlocked', () => {
        it('pairs the blocked trend with the standing blocked count', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                3
            );
            userAnalyticDomain.getCountByStatus.mockResolvedValue(5);

            const result = await domain.usersBlocked(startDate, endDate);

            expect(result).toEqual({ trend: 3, current: 5 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userBlocked],
                startDate,
                endDate
            );
            expect(userAnalyticDomain.getCountByStatus).toHaveBeenCalledWith(
                EnumUserStatus.blocked
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.usersBlocked(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('usersSignUpWith', () => {
        it('maps sign-up-with groups into counted buckets', async () => {
            const rows = [{ key: EnumUserSignUpWith.credential, count: 7 }];
            const buckets = [{ key: 'bucket-key', count: 7 }];
            userAnalyticDomain.getGroupBySignUpWith.mockResolvedValue(rows);
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await domain.usersSignUpWith(startDate, endDate);

            expect(result).toEqual({ buckets });
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'key'
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.usersSignUpWith(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('usersSignUpFrom', () => {
        it('maps sign-up-from groups into counted buckets', async () => {
            const rows = [{ key: EnumUserSignUpFrom.website, count: 7 }];
            const buckets = [{ key: 'bucket-key', count: 7 }];
            userAnalyticDomain.getGroupBySignUpFrom.mockResolvedValue(rows);
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await domain.usersSignUpFrom(startDate, endDate);

            expect(result).toEqual({ buckets });
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'key'
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.usersSignUpFrom(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('usersEmailVerification', () => {
        it('returns the email verification rate', async () => {
            const rate = { count: 4, total: 10, rate: 0.4 };
            userAnalyticDomain.getEmailVerificationRate.mockResolvedValue(rate);

            const result = await domain.usersEmailVerification(
                startDate,
                endDate
            );

            expect(result).toEqual(rate);
            expect(
                userAnalyticDomain.getEmailVerificationRate
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.usersEmailVerification(
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
            userMobileNumberAnalyticDomain.getVerificationRate.mockResolvedValue(
                rate
            );

            const result = await domain.usersMobileVerification(
                startDate,
                endDate
            );

            expect(result).toEqual(rate);
            expect(
                userMobileNumberAnalyticDomain.getVerificationRate
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.usersMobileVerification(
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
            userAnalyticDomain.getGroupByStatus.mockResolvedValue(rows);
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await domain.usersStatusDistribution();

            expect(result).toEqual({ buckets });
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'key'
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.usersStatusDistribution();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('usersCountryDistribution', () => {
        it('returns country buckets unchanged', async () => {
            const rows = [{ key: 'US', count: 4 }];
            userAnalyticDomain.getGroupByCountry.mockResolvedValue(rows);

            const result = await domain.usersCountryDistribution();

            expect(result).toEqual({ buckets: rows });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.usersCountryDistribution();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('usersRoleDistribution', () => {
        it('returns role buckets unchanged', async () => {
            const rows = [{ key: 'admin', count: 2 }];
            userAnalyticDomain.getGroupByRole.mockResolvedValue(rows);

            const result = await domain.usersRoleDistribution();

            expect(result).toEqual({ buckets: rows });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.usersRoleDistribution();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('usersSelfDelete', () => {
        it('counts self-delete activity in the range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                3
            );

            const result = await domain.usersSelfDelete(startDate, endDate);

            expect(result).toEqual({ count: 3 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userDeleteSelf],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.usersSelfDelete(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('usersClaimUsername', () => {
        it('counts username-claim activity in the range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                2
            );

            const result = await domain.usersClaimUsername(startDate, endDate);

            expect(result).toEqual({ count: 2 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userClaimUsername],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.usersClaimUsername(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('usersMobileChurn', () => {
        it('counts added, updated, and deleted mobile numbers in the range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(3);

            const result = await domain.usersMobileChurn(startDate, endDate);

            expect(result).toEqual({ added: 1, updated: 2, deleted: 3 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                [EnumActivityLogAction.userAddMobileNumber],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                [EnumActivityLogAction.userUpdateMobileNumber],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                3,
                [EnumActivityLogAction.userDeleteMobileNumber],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.usersMobileChurn(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authLoginFrequency', () => {
        it('wraps the login frequency count', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                12
            );

            const result = await domain.authLoginFrequency(startDate, endDate);

            expect(result).toEqual({ count: 12 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authLoginFrequency(startDate, endDate);

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
            activityLogAnalyticDomain.getGroupByActionInRange.mockResolvedValue(
                rows
            );
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await domain.authLoginMethod(null, null);

            expect(result).toEqual({ buckets });
            expect(
                activityLogAnalyticDomain.getGroupByActionInRange
            ).toHaveBeenCalledWith(UserLoginAnalyticActions, null, null);
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'action'
            );
        });

        it('forwards present dates into the action group read', async () => {
            activityLogAnalyticDomain.getGroupByActionInRange.mockResolvedValue(
                []
            );
            analyticBucketUtil.toBuckets.mockReturnValue([]);

            await domain.authLoginMethod(startDate, endDate);

            expect(
                activityLogAnalyticDomain.getGroupByActionInRange
            ).toHaveBeenCalledWith(
                UserLoginAnalyticActions,
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authLoginMethod(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authLoginSource', () => {
        it('maps login-source groups into counted buckets under its own cache key', async () => {
            const rows = [{ key: EnumUserLoginFrom.website, count: 7 }];
            const buckets = [{ key: EnumUserLoginFrom.website, count: 7 }];
            userAnalyticDomain.getGroupLoginSource.mockResolvedValue(rows);
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await domain.authLoginSource(startDate, endDate);

            expect(result).toEqual({ buckets });
            expect(userAnalyticDomain.getGroupLoginSource).toHaveBeenCalledWith(
                startDate,
                endDate
            );
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'key'
            );
            expect(
                activityLogAnalyticDomain.getGroupByActionInRange
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

            const result = await domain.authLoginSource(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authLockout', () => {
        it('counts failed logins and max-attempt lockouts in the range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange
                .mockResolvedValueOnce(6)
                .mockResolvedValueOnce(3);

            const result = await domain.authLockout(startDate, endDate);

            expect(result).toEqual({ failed: 6, maxAttempt: 3 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                [EnumActivityLogAction.userLoginFailed],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                [EnumActivityLogAction.userReachMaxPasswordAttempt],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authLockout(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authSessionRevoke', () => {
        it('counts every session-revoke activity in the range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                5
            );

            const result = await domain.authSessionRevoke(startDate, endDate);

            expect(result).toEqual({ count: 5 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [
                    EnumActivityLogAction.userRevokeSession,
                    EnumActivityLogAction.userRevokeSessionByAdmin,
                    EnumActivityLogAction.userRevokeAllSessions,
                    EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                ],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authSessionRevoke(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authConcurrentSessions', () => {
        it('maps active sessions per user into buckets', async () => {
            const rows = [{ userId: 'user-1', count: 2 }];
            const buckets = [{ key: 'user-1', count: 2 }];
            sessionAnalyticDomain.getCountActiveByUser.mockResolvedValue(rows);
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await domain.authConcurrentSessions();

            expect(result).toEqual({ buckets });
            expect(
                sessionAnalyticDomain.getCountActiveByUser
            ).toHaveBeenCalledWith(now);
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'userId'
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authConcurrentSessions();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authSessionsGeo', () => {
        it('returns session country buckets unchanged', async () => {
            const rows = [{ key: 'US', count: 4 }];
            sessionAnalyticDomain.getGroupByCountry.mockResolvedValue(rows);

            const result = await domain.authSessionsGeo(startDate, endDate);

            expect(result).toEqual({ buckets: rows });
            expect(
                sessionAnalyticDomain.getGroupByCountry
            ).toHaveBeenCalledWith(startDate, endDate, now);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authSessionsGeo(startDate, endDate);

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
            sessionAnalyticDomain.getActiveWithGeoInRange.mockResolvedValue(
                sessions
            );
            analyticBucketUtil.toBucketsByBrowser.mockReturnValue(buckets);

            const result = await domain.authSessionsUserAgent(
                startDate,
                endDate
            );

            expect(result).toEqual({ buckets });
            expect(
                sessionAnalyticDomain.getActiveWithGeoInRange
            ).toHaveBeenCalledWith(startDate, endDate, now);
            expect(analyticBucketUtil.toBucketsByBrowser).toHaveBeenCalledWith(
                sessions
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authSessionsUserAgent(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authRefreshTokenVolume', () => {
        it('counts refresh-token activity in the range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                8
            );

            const result = await domain.authRefreshTokenVolume(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 8 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userRefreshToken],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authRefreshTokenVolume(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authLogoutRate', () => {
        it('counts logout activity in the range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                4
            );

            const result = await domain.authLogoutRate(startDate, endDate);

            expect(result).toEqual({ count: 4 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authLogoutRate(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authVerificationFunnel', () => {
        it('pairs email and mobile verification funnels', async () => {
            const email = { used: 1, unused: 2, total: 3, rate: 0.33 };
            const mobile = { used: 4, unused: 1, total: 5, rate: 0.8 };
            userVerificationAnalyticDomain.getFunnel
                .mockResolvedValueOnce(email)
                .mockResolvedValueOnce(mobile);

            const result = await domain.authVerificationFunnel(
                startDate,
                endDate
            );

            expect(result).toEqual({ email, mobile });
            expect(
                userVerificationAnalyticDomain.getFunnel
            ).toHaveBeenNthCalledWith(
                1,
                EnumVerificationType.email,
                startDate,
                endDate
            );
            expect(
                userVerificationAnalyticDomain.getFunnel
            ).toHaveBeenNthCalledWith(
                2,
                EnumVerificationType.mobileNumber,
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authVerificationFunnel(
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
            const deferredActive = Promise.withResolvers<number>();
            userAnalyticDomain.getCountActive.mockReturnValue(
                deferredActive.promise
            );
            userPasswordAnalyticDomain.getExpiredCount.mockImplementation(
                async () => {
                    deferredActive.resolve(10);

                    return 2;
                }
            );
            userPasswordAnalyticDomain.mapExpiryCompliance.mockReturnValue(
                expiry
            );

            const result = await domain.authPasswordExpiry();

            expect(result).toEqual(expiry);
            expect(
                userPasswordAnalyticDomain.mapExpiryCompliance
            ).toHaveBeenCalledWith(2, 10);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authPasswordExpiry();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authPasswordChange', () => {
        it('counts profile password-history changes in the range', async () => {
            passwordHistoryAnalyticDomain.getCountByTypeInRange.mockResolvedValue(
                6
            );

            const result = await domain.authPasswordChange(startDate, endDate);

            expect(result).toEqual({ count: 6 });
            expect(
                passwordHistoryAnalyticDomain.getCountByTypeInRange
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.profile,
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authPasswordChange(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authForgotPasswordConversion', () => {
        it('returns forgot-password conversion', async () => {
            const conversion = { created: 5, used: 2, rate: 0.4 };
            userForgotPasswordAnalyticDomain.getConversion.mockResolvedValue(
                conversion
            );

            const result = await domain.authForgotPasswordConversion(
                startDate,
                endDate
            );

            expect(result).toEqual(conversion);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authForgotPasswordConversion(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authAdminForcePassword', () => {
        it('counts admin password-history changes in the range', async () => {
            passwordHistoryAnalyticDomain.getCountByTypeInRange.mockResolvedValue(
                1
            );

            const result = await domain.authAdminForcePassword(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 1 });
            expect(
                passwordHistoryAnalyticDomain.getCountByTypeInRange
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.admin,
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authAdminForcePassword(
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
            const deferredActive = Promise.withResolvers<number>();
            userAnalyticDomain.getCountActive.mockReturnValue(
                deferredActive.promise
            );
            userTwoFactorAnalyticDomain.getEnabledCount.mockImplementation(
                async () => {
                    deferredActive.resolve(9);

                    return 3;
                }
            );
            userTwoFactorAnalyticDomain.mapAdoption.mockReturnValue(adoption);

            const result = await domain.authTwoFactorAdoption();

            expect(result).toEqual(adoption);
            expect(
                userTwoFactorAnalyticDomain.mapAdoption
            ).toHaveBeenCalledWith(3, 9);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authTwoFactorAdoption();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authTwoFactorAdminReset', () => {
        it('counts admin two-factor resets in the range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                2
            );

            const result = await domain.authTwoFactorAdminReset(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 2 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userResetTwoFactorByAdmin],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authTwoFactorAdminReset(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authTwoFactorVerifySuccess', () => {
        it('counts successful two-factor verifications in the range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                8
            );

            const result = await domain.authTwoFactorVerifySuccess(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 8 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userVerifyTwoFactor],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authTwoFactorVerifySuccess(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('authBackupCodeRegeneration', () => {
        it('counts backup-code regenerations in the range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                3
            );

            const result = await domain.authBackupCodeRegeneration(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 3 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userRegenerateTwoFactorBackupCodes],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authBackupCodeRegeneration(
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
            userTwoFactorAnalyticDomain.getAttemptSnapshot.mockResolvedValue(
                snapshot
            );

            const result = await domain.authTwoFactorAttempt();

            expect(result).toEqual(snapshot);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.authTwoFactorAttempt();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('devicesRegistration', () => {
        it('wraps the device registration count', async () => {
            deviceAnalyticDomain.getCountRegistrations.mockResolvedValue(9);

            const result = await domain.devicesRegistration(startDate, endDate);

            expect(result).toEqual({ count: 9 });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.devicesRegistration(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('devicesPlatform', () => {
        it('returns platform buckets unchanged', async () => {
            const rows = [{ key: 'ios', count: 4 }];
            deviceAnalyticDomain.getGroupByPlatform.mockResolvedValue(rows);

            const result = await domain.devicesPlatform();

            expect(result).toEqual({ buckets: rows });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.devicesPlatform();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('devicesPushToken', () => {
        it('returns the push-token rate', async () => {
            const rate = { count: 4, total: 10, rate: 0.4 };
            deviceAnalyticDomain.getPushTokenRate.mockResolvedValue(rate);

            const result = await domain.devicesPushToken();

            expect(result).toEqual(rate);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.devicesPushToken();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('devicesInfoRefresh', () => {
        it('counts device-refresh activity in the range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange.mockResolvedValue(
                7
            );

            const result = await domain.devicesInfoRefresh(startDate, endDate);

            expect(result).toEqual({ count: 7 });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenCalledWith(
                [EnumActivityLogAction.userDeviceRefresh],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.devicesInfoRefresh(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('devicesSessionRatio', () => {
        it('divides sessions by devices when devices exist', async () => {
            sessionAnalyticDomain.getCountActive.mockResolvedValue(10);
            deviceAnalyticDomain.getCountOwnerships.mockResolvedValue(5);

            const result = await domain.devicesSessionRatio();

            expect(result).toEqual({ sessions: 10, devices: 5, ratio: 2 });
            expect(sessionAnalyticDomain.getCountActive).toHaveBeenCalledWith(
                now
            );
        });

        it('returns a zero ratio when no devices exist', async () => {
            sessionAnalyticDomain.getCountActive.mockResolvedValue(10);
            deviceAnalyticDomain.getCountOwnerships.mockResolvedValue(0);

            const result = await domain.devicesSessionRatio();

            expect(result).toEqual({ sessions: 10, devices: 0, ratio: 0 });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.devicesSessionRatio();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('devicesPerUser', () => {
        it('maps per-user device counts into buckets', async () => {
            const rows = [{ userId: 'user-1', count: 3 }];
            const buckets = [{ key: 'bucket-key', count: 7 }];
            deviceAnalyticDomain.getCountPerUser.mockResolvedValue(rows);
            analyticBucketUtil.toBuckets.mockReturnValue(buckets);

            const result = await domain.devicesPerUser();

            expect(result).toEqual({ buckets });
            expect(analyticBucketUtil.toBuckets).toHaveBeenCalledWith(
                rows,
                'userId'
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.devicesPerUser();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('devicesInactivity', () => {
        it('counts devices inactive for thirty days', async () => {
            const now = new Date('2026-03-01T00:00:00.000Z');
            const before = new Date('2026-01-30T00:00:00.000Z');
            helperDateService.create.mockReturnValue(now);
            helperDateService.backward.mockReturnValue(before);
            deviceAnalyticDomain.getInactive.mockResolvedValue([
                {
                    id: 'ownership-1',
                    userId: 'user-1',
                    lastActiveAt: before,
                    deviceId: 'device-1',
                },
            ]);

            const result = await domain.devicesInactivity();

            expect(result).toEqual({ count: 1 });
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                Duration.fromObject({ days: 30 })
            );
            expect(deviceAnalyticDomain.getInactive).toHaveBeenCalledWith(
                before
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.devicesInactivity();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('apiKeysLifecycle', () => {
        it('counts created, reset, updated, and deleted API key activity in the range', async () => {
            activityLogAnalyticDomain.getCountByActionsInRange
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(3)
                .mockResolvedValueOnce(4);

            const result = await domain.apiKeysLifecycle(startDate, endDate);

            expect(result).toEqual({
                created: 1,
                reset: 2,
                updated: 3,
                deleted: 4,
            });
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                1,
                [EnumActivityLogAction.adminApiKeyCreate],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                2,
                [EnumActivityLogAction.adminApiKeyReset],
                startDate,
                endDate
            );
            expect(
                activityLogAnalyticDomain.getCountByActionsInRange
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
                activityLogAnalyticDomain.getCountByActionsInRange
            ).toHaveBeenNthCalledWith(
                4,
                [EnumActivityLogAction.adminApiKeyDelete],
                startDate,
                endDate
            );
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.apiKeysLifecycle(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('apiKeysActiveExpired', () => {
        it('returns active versus expired API key counts', async () => {
            const counts = { active: 6, expired: 1 };
            apiKeyAnalyticDomain.getActiveExpired.mockResolvedValue(counts);

            const result = await domain.apiKeysActiveExpired();

            expect(result).toEqual(counts);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.apiKeysActiveExpired();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('apiKeysTypeMix', () => {
        it('returns API key type buckets unchanged', async () => {
            const rows = [{ key: 'default', count: 4 }];
            apiKeyAnalyticDomain.getTypeMix.mockResolvedValue(rows);

            const result = await domain.apiKeysTypeMix();

            expect(result).toEqual({ buckets: rows });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.apiKeysTypeMix();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('termPoliciesAcceptanceRate', () => {
        it('reads the counts together with omitted dates as null, then maps the rate', async () => {
            const rate = {
                acceptances: 4,
                users: 8,
                published: 2,
                rate: 0.5,
            };
            const counts = { acceptances: 4, published: 2 };
            const deferredActive = Promise.withResolvers<number>();
            userAnalyticDomain.getCountActive.mockReturnValue(
                deferredActive.promise
            );
            termPolicyAcceptanceAnalyticDomain.getAcceptanceCounts.mockImplementation(
                async () => {
                    deferredActive.resolve(8);

                    return counts;
                }
            );
            termPolicyAcceptanceAnalyticDomain.mapAcceptanceRate.mockReturnValue(
                rate
            );

            const result = await domain.termPoliciesAcceptanceRate(null, null);

            expect(result).toEqual(rate);
            expect(
                termPolicyAcceptanceAnalyticDomain.getAcceptanceCounts
            ).toHaveBeenCalledWith(null, null);
            expect(
                termPolicyAcceptanceAnalyticDomain.mapAcceptanceRate
            ).toHaveBeenCalledWith(counts, 8);
        });

        it('forwards present dates into the counts read', async () => {
            userAnalyticDomain.getCountActive.mockResolvedValue(3);
            termPolicyAcceptanceAnalyticDomain.getAcceptanceCounts.mockResolvedValue(
                { acceptances: 0, published: 0 }
            );
            termPolicyAcceptanceAnalyticDomain.mapAcceptanceRate.mockReturnValue(
                { acceptances: 0, users: 3, published: 0, rate: 0 }
            );

            await domain.termPoliciesAcceptanceRate(startDate, endDate);

            expect(
                termPolicyAcceptanceAnalyticDomain.getAcceptanceCounts
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.termPoliciesAcceptanceRate(
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
            termPolicyAcceptanceAnalyticDomain.getTimeToAccept.mockResolvedValue(
                timing
            );

            const result = await domain.termPoliciesTimeToAccept(null, null);

            expect(result).toEqual(timing);
            expect(
                termPolicyAcceptanceAnalyticDomain.getTimeToAccept
            ).toHaveBeenCalledWith(null, null);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.termPoliciesTimeToAccept(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('workspacesCreation', () => {
        it('wraps the workspace creation count', async () => {
            workspaceAnalyticDomain.getCountCreated.mockResolvedValue(4);

            const result = await domain.workspacesCreation(startDate, endDate);

            expect(result).toEqual({ count: 4 });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.workspacesCreation(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('workspacesVisibility', () => {
        it('returns visibility buckets unchanged', async () => {
            const rows = [{ key: 'private', count: 3 }];
            workspaceAnalyticDomain.getGroupByVisibility.mockResolvedValue(
                rows
            );

            const result = await domain.workspacesVisibility();

            expect(result).toEqual({ buckets: rows });
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.workspacesVisibility();

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('workspacesInviteFunnel', () => {
        it('asks the invite domain with a null workspace id', async () => {
            const rows = [{ status: 'pending', count: 2 }];
            workspaceInviteAnalyticDomain.getFunnel.mockResolvedValue(rows);

            const result = await domain.workspacesInviteFunnel(
                startDate,
                endDate
            );

            expect(result).toEqual(rows);
            expect(
                workspaceInviteAnalyticDomain.getFunnel
            ).toHaveBeenCalledWith(startDate, endDate, null);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.workspacesInviteFunnel(
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
            workspaceJoinRequestAnalyticDomain.getOutcomes.mockResolvedValue(
                rows
            );

            const result = await domain.workspacesJoinOutcomes(
                startDate,
                endDate
            );

            expect(result).toEqual(rows);
            expect(
                workspaceJoinRequestAnalyticDomain.getOutcomes
            ).toHaveBeenCalledWith(startDate, endDate, null);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.workspacesJoinOutcomes(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('workspacesMembership', () => {
        it('caches membership pages by page token', async () => {
            workspaceMemberAnalyticDomain.getMembershipDistributionOffset.mockResolvedValue(
                offsetPage
            );

            const result = await domain.workspacesMembership(pagination);

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

            const result = await domain.workspacesMembership(pagination);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('workspacesActivityVolume', () => {
        it('caches activity pages by page token and date range', async () => {
            activityLogAnalyticDomain.getGroupActivityByWorkspaceOffset.mockResolvedValue(
                offsetPage
            );

            const result = await domain.workspacesActivityVolume(
                startDate,
                endDate,
                pagination
            );

            expect(result).toEqual(offsetPage);
            expect(
                activityLogAnalyticDomain.getGroupActivityByWorkspaceOffset
            ).toHaveBeenCalledWith(startDate, endDate, pagination);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.workspacesActivityVolume(
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
            projectAnalyticDomain.getCreation.mockResolvedValue(creation);

            const result = await domain.projectsCreation(startDate, endDate);

            expect(result).toEqual(creation);
        });

        it('returns the cached value without storing on a cache hit', async () => {
            analyticCache.getDashboard.mockResolvedValue(cachedValue);

            const result = await domain.projectsCreation(startDate, endDate);

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
            projectMemberAnalyticDomain.getMembershipDistributionOffset.mockResolvedValue(
                page
            );

            const result = await domain.projectsMembership(pagination);

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

            const result = await domain.projectsMembership(pagination);

            expect(result).toBe(cachedValue);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });
    });

    describe('readCache', () => {
        it('returns the stored value read under the date tokens', async () => {
            const stored = { count: 99 };
            analyticCache.getDashboard.mockResolvedValue(stored);

            const result = await domain['readCache'](
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
            const result = await domain['readCache'](
                'users.registrations',
                startDate,
                endDate
            );

            expect(result).toBeNull();
        });
    });

    describe('writeCache', () => {
        it('stores the value under the date tokens', async () => {
            await domain['writeCache'](
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

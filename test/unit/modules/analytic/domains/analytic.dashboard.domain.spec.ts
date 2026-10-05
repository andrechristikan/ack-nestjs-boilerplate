import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Duration } from 'luxon';
import {
    EnumActivityLogAction,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { UserAgent } from '@generated/prisma-client/client';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticDashboardDomain } from '@modules/analytic/domains/analytic.dashboard.domain';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { ApiKeyAnalyticDomain } from '@modules/api-key/domains/api-key.analytic.domain';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { ProjectAnalyticDomain } from '@modules/project/domains/project.analytic.domain';
import { ProjectMemberAnalyticDomain } from '@modules/project/domains/project.member.analytic.domain';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';
import { TermPolicyAcceptanceAnalyticDomain } from '@modules/term-policy/domains/term-policy.acceptance.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserForgotPasswordAnalyticDomain } from '@modules/user/domains/user.forgot-password.analytic.domain';
import { UserLoginAnalyticDomain } from '@modules/user/domains/user.login.analytic.domain';
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
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const userAnalyticDomain: MockProxy<UserAnalyticDomain> =
        mock<UserAnalyticDomain>();
    const userLoginAnalyticDomain: MockProxy<UserLoginAnalyticDomain> =
        mock<UserLoginAnalyticDomain>();
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

    let domain: AnalyticDashboardDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        analyticDateUtil.cacheToken.mockImplementation((date?: Date) =>
            date ? date.toISOString() : '_'
        );
        analyticCache.getDashboard.mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDashboardDomain,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: UserAnalyticDomain, useValue: userAnalyticDomain },
                {
                    provide: UserLoginAnalyticDomain,
                    useValue: userLoginAnalyticDomain,
                },
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
    });

    describe('usersSignUpWith', () => {
        it('maps sign-up-with groups into counted buckets', async () => {
            userAnalyticDomain.getGroupBySignUpWith.mockResolvedValue([
                { key: EnumUserSignUpWith.credential, count: 7 },
            ]);

            const result = await domain.usersSignUpWith(startDate, endDate);

            expect(result).toEqual({
                buckets: [
                    { key: String(EnumUserSignUpWith.credential), count: 7 },
                ],
            });
        });
    });

    describe('usersSignUpFrom', () => {
        it('maps sign-up-from groups into counted buckets', async () => {
            userAnalyticDomain.getGroupBySignUpFrom.mockResolvedValue([
                { key: EnumUserSignUpFrom.website, count: 7 },
            ]);

            const result = await domain.usersSignUpFrom(startDate, endDate);

            expect(result).toEqual({
                buckets: [
                    { key: String(EnumUserSignUpFrom.website), count: 7 },
                ],
            });
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
            ).toHaveBeenCalledWith();
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
        });
    });

    describe('usersStatusDistribution', () => {
        it('maps status groups into counted buckets', async () => {
            userAnalyticDomain.getGroupByStatus.mockResolvedValue([
                { key: EnumUserStatus.active, count: 8 },
            ]);

            const result = await domain.usersStatusDistribution();

            expect(result).toEqual({
                buckets: [{ key: String(EnumUserStatus.active), count: 8 }],
            });
        });
    });

    describe('usersCountryDistribution', () => {
        it('returns country buckets unchanged', async () => {
            const rows = [{ key: 'US', count: 4 }];
            userAnalyticDomain.getGroupByCountry.mockResolvedValue(rows);

            const result = await domain.usersCountryDistribution();

            expect(result).toEqual({ buckets: rows });
        });
    });

    describe('usersRoleDistribution', () => {
        it('returns role buckets unchanged', async () => {
            const rows = [{ key: 'admin', count: 2 }];
            userAnalyticDomain.getGroupByRole.mockResolvedValue(rows);

            const result = await domain.usersRoleDistribution();

            expect(result).toEqual({ buckets: rows });
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
    });

    describe('usersMobileChurn', () => {
        it('returns mobile-number churn from the mobile analytic domain', async () => {
            const churn = { added: 1, updated: 2, deleted: 3 };
            userMobileNumberAnalyticDomain.getChurn.mockResolvedValue(churn);

            const result = await domain.usersMobileChurn(startDate, endDate);

            expect(result).toEqual(churn);
            expect(
                userMobileNumberAnalyticDomain.getChurn
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('authLoginFrequency', () => {
        it('wraps the login frequency count', async () => {
            userLoginAnalyticDomain.getLoginFrequency.mockResolvedValue(12);

            const result = await domain.authLoginFrequency(startDate, endDate);

            expect(result).toEqual({ count: 12 });
        });
    });

    describe('authLoginMethod', () => {
        it('maps login-method actions into buckets and nulls omitted dates', async () => {
            userLoginAnalyticDomain.getLoginMethodMix.mockResolvedValue([
                { action: EnumActivityLogAction.userLoginCredential, count: 7 },
            ]);

            const result = await domain.authLoginMethod();

            expect(result).toEqual({
                buckets: [
                    {
                        key: EnumActivityLogAction.userLoginCredential,
                        count: 7,
                    },
                ],
            });
            expect(
                userLoginAnalyticDomain.getLoginMethodMix
            ).toHaveBeenCalledWith(null, null);
        });

        it('forwards present dates into loginMethodMix', async () => {
            userLoginAnalyticDomain.getLoginMethodMix.mockResolvedValue([]);

            await domain.authLoginMethod(startDate, endDate);

            expect(
                userLoginAnalyticDomain.getLoginMethodMix
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('authLoginSource', () => {
        it('reuses the login-method buckets', async () => {
            userLoginAnalyticDomain.getLoginMethodMix.mockResolvedValue([
                { action: EnumActivityLogAction.userLoginCredential, count: 7 },
            ]);

            const result = await domain.authLoginSource(startDate, endDate);

            expect(result).toEqual({
                buckets: [
                    {
                        key: EnumActivityLogAction.userLoginCredential,
                        count: 7,
                    },
                ],
            });
        });
    });

    describe('authLockout', () => {
        it('returns lockout metrics from the login analytic domain', async () => {
            const metrics = { failed: 6, maxAttempt: 3 };
            userLoginAnalyticDomain.getLockoutMetrics.mockResolvedValue(
                metrics
            );

            const result = await domain.authLockout(startDate, endDate);

            expect(result).toEqual(metrics);
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
    });

    describe('authConcurrentSessions', () => {
        it('maps active sessions per user into buckets', async () => {
            sessionAnalyticDomain.getCountActiveByUser.mockResolvedValue([
                { userId: 'user-1', count: 2 },
            ]);

            const result = await domain.authConcurrentSessions();

            expect(result).toEqual({
                buckets: [{ key: 'user-1', count: 2 }],
            });
        });
    });

    describe('authSessionsGeo', () => {
        it('returns session country buckets unchanged', async () => {
            const rows = [{ key: 'US', count: 4 }];
            sessionAnalyticDomain.getGroupByCountry.mockResolvedValue(rows);

            const result = await domain.authSessionsGeo(startDate, endDate);

            expect(result).toEqual({ buckets: rows });
        });
    });

    describe('authSessionsUserAgent', () => {
        it('buckets sessions by browser, os, unknown, and increments repeats', async () => {
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
            const ios: UserAgent = {
                ua: null,
                browser: null,
                cpu: { architecture: null },
                device: { type: null, vendor: null, model: null },
                engine: { name: null, version: null },
                os: { name: 'iOS', version: null },
            };
            const unknown: UserAgent = {
                ua: null,
                browser: null,
                cpu: { architecture: null },
                device: { type: null, vendor: null, model: null },
                engine: { name: null, version: null },
                os: { name: null, version: null },
            };
            sessionAnalyticDomain.getActiveWithGeoInRange.mockResolvedValue([
                {
                    id: 'session-1',
                    userId: 'user-1',
                    ipAddress: null,
                    createdAt: startDate,
                    geoLocation: null,
                    userAgent: chrome,
                },
                {
                    id: 'session-2',
                    userId: 'user-2',
                    ipAddress: null,
                    createdAt: startDate,
                    geoLocation: null,
                    userAgent: chrome,
                },
                {
                    id: 'session-3',
                    userId: 'user-3',
                    ipAddress: null,
                    createdAt: startDate,
                    geoLocation: null,
                    userAgent: ios,
                },
                {
                    id: 'session-4',
                    userId: 'user-4',
                    ipAddress: null,
                    createdAt: startDate,
                    geoLocation: null,
                    userAgent: unknown,
                },
            ]);

            const result = await domain.authSessionsUserAgent(
                startDate,
                endDate
            );

            expect(result).toEqual({
                buckets: [
                    { key: 'Chrome', count: 2 },
                    { key: 'iOS', count: 1 },
                    { key: 'unknown', count: 1 },
                ],
            });
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
    });

    describe('authPasswordExpiry', () => {
        it('returns password-expiry compliance', async () => {
            const expiry = {
                expired: 2,
                total: 10,
                compliant: 8,
                rate: 0.8,
            };
            userPasswordAnalyticDomain.getPasswordExpiryCompliance.mockResolvedValue(
                expiry
            );

            const result = await domain.authPasswordExpiry();

            expect(result).toEqual(expiry);
        });
    });

    describe('authPasswordChange', () => {
        it('wraps the password-change count', async () => {
            userPasswordAnalyticDomain.getPasswordChangeCount.mockResolvedValue(
                6
            );

            const result = await domain.authPasswordChange(startDate, endDate);

            expect(result).toEqual({ count: 6 });
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
    });

    describe('authAdminForcePassword', () => {
        it('wraps the admin force-password count', async () => {
            userPasswordAnalyticDomain.getAdminForcePasswordCount.mockResolvedValue(
                1
            );

            const result = await domain.authAdminForcePassword(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 1 });
        });
    });

    describe('authTwoFactorAdoption', () => {
        it('returns two-factor adoption', async () => {
            const adoption = { enabled: 3, total: 9, rate: 0.33 };
            userTwoFactorAnalyticDomain.getAdoption.mockResolvedValue(adoption);

            const result = await domain.authTwoFactorAdoption();

            expect(result).toEqual(adoption);
        });
    });

    describe('authTwoFactorAdminReset', () => {
        it('wraps the admin two-factor reset count', async () => {
            userTwoFactorAnalyticDomain.getAdminResetCount.mockResolvedValue(2);

            const result = await domain.authTwoFactorAdminReset(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 2 });
        });
    });

    describe('authTwoFactorVerifySuccess', () => {
        it('wraps the two-factor verify-success count', async () => {
            userTwoFactorAnalyticDomain.getVerifySuccessCount.mockResolvedValue(
                8
            );

            const result = await domain.authTwoFactorVerifySuccess(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 8 });
        });
    });

    describe('authBackupCodeRegeneration', () => {
        it('wraps the backup-code regeneration count', async () => {
            userTwoFactorAnalyticDomain.getBackupCodeRegenerationCount.mockResolvedValue(
                3
            );

            const result = await domain.authBackupCodeRegeneration(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 3 });
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
    });

    describe('devicesRegistration', () => {
        it('wraps the device registration count', async () => {
            deviceAnalyticDomain.getCountRegistrations.mockResolvedValue(9);

            const result = await domain.devicesRegistration(startDate, endDate);

            expect(result).toEqual({ count: 9 });
        });
    });

    describe('devicesPlatform', () => {
        it('returns platform buckets unchanged', async () => {
            const rows = [{ key: 'ios', count: 4 }];
            deviceAnalyticDomain.getGroupByPlatform.mockResolvedValue(rows);

            const result = await domain.devicesPlatform();

            expect(result).toEqual({ buckets: rows });
        });
    });

    describe('devicesPushToken', () => {
        it('returns the push-token rate', async () => {
            const rate = { count: 4, total: 10, rate: 0.4 };
            deviceAnalyticDomain.getPushTokenRate.mockResolvedValue(rate);

            const result = await domain.devicesPushToken();

            expect(result).toEqual(rate);
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
    });

    describe('devicesSessionRatio', () => {
        it('divides sessions by devices when devices exist', async () => {
            sessionAnalyticDomain.getCountActive.mockResolvedValue(10);
            deviceAnalyticDomain.getCountOwnerships.mockResolvedValue(5);

            const result = await domain.devicesSessionRatio();

            expect(result).toEqual({ sessions: 10, devices: 5, ratio: 2 });
        });

        it('returns a zero ratio when no devices exist', async () => {
            sessionAnalyticDomain.getCountActive.mockResolvedValue(10);
            deviceAnalyticDomain.getCountOwnerships.mockResolvedValue(0);

            const result = await domain.devicesSessionRatio();

            expect(result).toEqual({ sessions: 10, devices: 0, ratio: 0 });
        });
    });

    describe('devicesPerUser', () => {
        it('maps per-user device counts into buckets', async () => {
            deviceAnalyticDomain.getCountPerUser.mockResolvedValue([
                { userId: 'user-1', count: 3 },
            ]);

            const result = await domain.devicesPerUser();

            expect(result).toEqual({
                buckets: [{ key: 'user-1', count: 3 }],
            });
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
    });

    describe('apiKeysLifecycle', () => {
        it('returns API key lifecycle counts', async () => {
            const lifecycle = { created: 1, reset: 2, updated: 3, deleted: 4 };
            apiKeyAnalyticDomain.getLifecycle.mockResolvedValue(lifecycle);

            const result = await domain.apiKeysLifecycle(startDate, endDate);

            expect(result).toEqual(lifecycle);
        });
    });

    describe('apiKeysActiveExpired', () => {
        it('returns active versus expired API key counts', async () => {
            const counts = { active: 6, expired: 1 };
            apiKeyAnalyticDomain.getActiveExpired.mockResolvedValue(counts);

            const result = await domain.apiKeysActiveExpired();

            expect(result).toEqual(counts);
        });
    });

    describe('apiKeysTypeMix', () => {
        it('returns API key type buckets unchanged', async () => {
            const rows = [{ key: 'default', count: 4 }];
            apiKeyAnalyticDomain.getTypeMix.mockResolvedValue(rows);

            const result = await domain.apiKeysTypeMix();

            expect(result).toEqual({ buckets: rows });
        });
    });

    describe('termPoliciesAcceptanceRate', () => {
        it('nulls omitted dates before asking for the acceptance rate', async () => {
            const rate = {
                acceptances: 4,
                users: 8,
                published: 2,
                rate: 0.5,
            };
            termPolicyAcceptanceAnalyticDomain.getAcceptanceRate.mockResolvedValue(
                rate
            );

            const result = await domain.termPoliciesAcceptanceRate();

            expect(result).toEqual(rate);
            expect(
                termPolicyAcceptanceAnalyticDomain.getAcceptanceRate
            ).toHaveBeenCalledWith(null, null);
        });

        it('forwards present dates into acceptanceRate', async () => {
            termPolicyAcceptanceAnalyticDomain.getAcceptanceRate.mockResolvedValue(
                { acceptances: 0, users: 0, published: 0, rate: 0 }
            );

            await domain.termPoliciesAcceptanceRate(startDate, endDate);

            expect(
                termPolicyAcceptanceAnalyticDomain.getAcceptanceRate
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('termPoliciesTimeToAccept', () => {
        it('nulls omitted dates before asking for time to accept', async () => {
            const timing = { count: 3, averageMs: 1500 };
            termPolicyAcceptanceAnalyticDomain.getTimeToAccept.mockResolvedValue(
                timing
            );

            const result = await domain.termPoliciesTimeToAccept();

            expect(result).toEqual(timing);
            expect(
                termPolicyAcceptanceAnalyticDomain.getTimeToAccept
            ).toHaveBeenCalledWith(null, null);
        });
    });

    describe('workspacesCreation', () => {
        it('wraps the workspace creation count', async () => {
            workspaceAnalyticDomain.getCountCreated.mockResolvedValue(4);

            const result = await domain.workspacesCreation(startDate, endDate);

            expect(result).toEqual({ count: 4 });
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
    });

    describe('workspacesMembership', () => {
        it('caches membership pages by page token', async () => {
            workspaceMemberAnalyticDomain.getMembershipDistributionOffset.mockResolvedValue(
                offsetPage
            );

            const result = await domain.workspacesMembership(pagination);

            expect(result).toEqual(offsetPage);
            expect(analyticCache.getDashboard).toHaveBeenCalledWith(
                'workspaces.membership:page=1:perPage=20',
                '_',
                '_'
            );
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
            expect(analyticCache.getDashboard).toHaveBeenCalledWith(
                'projects.membership:page=1:perPage=20',
                '_',
                '_'
            );
        });
    });

    describe('pageToken', () => {
        it('encodes a 1-based page from skip and limit', () => {
            expect(
                domain['pageToken']({ skip: 0, limit: 20, orderBy: [] })
            ).toBe('page=1:perPage=20');
            expect(
                domain['pageToken']({ skip: 20, limit: 20, orderBy: [] })
            ).toBe('page=2:perPage=20');
        });
    });

    describe('cached', () => {
        it('returns the store value on a cache hit without computing', async () => {
            const cached = { count: 99 };
            analyticCache.getDashboard.mockResolvedValue(cached);

            const result = await domain['cached'](
                'users.registrations',
                startDate,
                endDate,
                vi.fn().mockResolvedValue({ count: 1 })
            );

            expect(result).toEqual(cached);
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });

        it('computes and stores the value on a cache miss', async () => {
            const result = await domain['cached'](
                'users.registrations',
                startDate,
                endDate,
                vi.fn().mockResolvedValue({ count: 1 })
            );

            expect(result).toEqual({ count: 1 });
            expect(analyticCache.setDashboard).toHaveBeenCalledWith(
                'users.registrations',
                startDate.toISOString(),
                endDate.toISOString(),
                { count: 1 }
            );
        });
    });
});

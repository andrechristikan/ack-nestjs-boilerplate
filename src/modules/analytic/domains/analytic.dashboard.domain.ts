import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticDashboardPagedMetricPattern } from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type {
    IAnalyticApiKeyActiveExpired,
    IAnalyticApiKeyLifecycle,
    IAnalyticBlockedUsers,
    IAnalyticBucketsResult,
    IAnalyticForgotPasswordConversion,
    IAnalyticLockoutMetrics,
    IAnalyticMetricCount,
    IAnalyticMetricRate,
    IAnalyticMobileChurn,
    IAnalyticPasswordExpiry,
    IAnalyticProjectCount,
    IAnalyticProjectCreation,
    IAnalyticSessionDeviceRatio,
    IAnalyticStatusCount,
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticTermPolicyTimeToAccept,
    IAnalyticTwoFactorAdoption,
    IAnalyticTwoFactorAttemptSnapshot,
    IAnalyticVerificationFunnels,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';
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
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticDashboardDomain {
    constructor(
        private readonly analyticCache: AnalyticCache,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly userAnalyticDomain: UserAnalyticDomain,
        private readonly userLoginAnalyticDomain: UserLoginAnalyticDomain,
        private readonly userPasswordAnalyticDomain: UserPasswordAnalyticDomain,
        private readonly userForgotPasswordAnalyticDomain: UserForgotPasswordAnalyticDomain,
        private readonly userTwoFactorAnalyticDomain: UserTwoFactorAnalyticDomain,
        private readonly userVerificationAnalyticDomain: UserVerificationAnalyticDomain,
        private readonly userMobileNumberAnalyticDomain: UserMobileNumberAnalyticDomain,
        private readonly activityLogAnalyticDomain: ActivityLogAnalyticDomain,
        private readonly sessionAnalyticDomain: SessionAnalyticDomain,
        private readonly deviceAnalyticDomain: DeviceAnalyticDomain,
        private readonly apiKeyAnalyticDomain: ApiKeyAnalyticDomain,
        private readonly termPolicyAcceptanceAnalyticDomain: TermPolicyAcceptanceAnalyticDomain,
        private readonly workspaceAnalyticDomain: WorkspaceAnalyticDomain,
        private readonly workspaceInviteAnalyticDomain: WorkspaceInviteAnalyticDomain,
        private readonly workspaceJoinRequestAnalyticDomain: WorkspaceJoinRequestAnalyticDomain,
        private readonly workspaceMemberAnalyticDomain: WorkspaceMemberAnalyticDomain,
        private readonly projectAnalyticDomain: ProjectAnalyticDomain,
        private readonly projectMemberAnalyticDomain: ProjectMemberAnalyticDomain
    ) {}

    private pagedMetric(
        metric: EnumAnalyticDashboardMetric,
        params: IPaginationQueryOffsetParams<unknown>
    ): string {
        const page = Math.floor(params.skip / params.limit) + 1;

        return this.helperStringService.fillPattern(
            AnalyticDashboardPagedMetricPattern,
            { metric, page: String(page), perPage: String(params.limit) }
        );
    }

    private async readCache<T>(
        metric: string,
        start: Date | null,
        end: Date | null
    ): Promise<T | null> {
        const startToken = this.analyticDateUtil.cacheToken(start);
        const endToken = this.analyticDateUtil.cacheToken(end);

        return this.analyticCache.getDashboard<T>(metric, startToken, endToken);
    }

    private async writeCache<T>(
        metric: string,
        start: Date | null,
        end: Date | null,
        value: T
    ): Promise<void> {
        const startToken = this.analyticDateUtil.cacheToken(start);
        const endToken = this.analyticDateUtil.cacheToken(end);

        await this.analyticCache.setDashboard(
            metric,
            startToken,
            endToken,
            value
        );
    }

    async usersRegistrations(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.usersRegistrations;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count = await this.userAnalyticDomain.getCountRegistrations(
            startDate,
            endDate
        );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async usersChurn(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricRate> {
        const metric = EnumAnalyticDashboardMetric.usersChurn;
        const cached = await this.readCache<IAnalyticMetricRate>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const result = await this.userAnalyticDomain.getChurnRate(
            startDate,
            endDate
        );
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async usersBlocked(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBlockedUsers> {
        const metric = EnumAnalyticDashboardMetric.usersBlocked;
        const cached = await this.readCache<IAnalyticBlockedUsers>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const [trend, current] = await Promise.all([
            this.activityLogAnalyticDomain.getCountByActionsInRange(
                [EnumActivityLogAction.userBlocked],
                startDate,
                endDate
            ),
            this.userAnalyticDomain.getCountByStatus(EnumUserStatus.blocked),
        ]);

        const result = { trend, current };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async usersSignUpWith(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.usersSignUpWith;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const rows = await this.userAnalyticDomain.getGroupBySignUpWith(
            startDate,
            endDate
        );

        const result = {
            buckets: rows.map(r => ({
                key: String(r.key),
                count: r.count,
            })),
        };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async usersSignUpFrom(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.usersSignUpFrom;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const rows = await this.userAnalyticDomain.getGroupBySignUpFrom(
            startDate,
            endDate
        );

        const result = {
            buckets: rows.map(r => ({
                key: String(r.key),
                count: r.count,
            })),
        };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async usersEmailVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticMetricRate> {
        const metric = EnumAnalyticDashboardMetric.usersEmailVerification;
        const cached = await this.readCache<IAnalyticMetricRate>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const result = await this.userAnalyticDomain.getEmailVerificationRate();
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async usersMobileVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticMetricRate> {
        const metric = EnumAnalyticDashboardMetric.usersMobileVerification;
        const cached = await this.readCache<IAnalyticMetricRate>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const result =
            await this.userMobileNumberAnalyticDomain.getVerificationRate();
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async usersStatusDistribution(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.usersStatus;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const rows = await this.userAnalyticDomain.getGroupByStatus();

        const result = {
            buckets: rows.map(r => ({
                key: String(r.key),
                count: r.count,
            })),
        };
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async usersCountryDistribution(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.usersCountry;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const rows = await this.userAnalyticDomain.getGroupByCountry();

        const result = { buckets: rows };
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async usersRoleDistribution(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.usersRole;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const rows = await this.userAnalyticDomain.getGroupByRole();

        const result = { buckets: rows };
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async usersSelfDelete(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.usersSelfDelete;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count =
            await this.activityLogAnalyticDomain.getCountByActionsInRange(
                [EnumActivityLogAction.userDeleteSelf],
                startDate,
                endDate
            );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async usersClaimUsername(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.usersClaimUsername;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count =
            await this.activityLogAnalyticDomain.getCountByActionsInRange(
                [EnumActivityLogAction.userClaimUsername],
                startDate,
                endDate
            );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async usersMobileChurn(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMobileChurn> {
        const metric = EnumAnalyticDashboardMetric.usersMobileChurn;
        const cached = await this.readCache<IAnalyticMobileChurn>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const result = await this.userMobileNumberAnalyticDomain.getChurn(
            startDate,
            endDate
        );
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authLoginFrequency(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authLoginFrequency;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count = await this.userLoginAnalyticDomain.getLoginFrequency(
            startDate,
            endDate
        );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authLoginMethod(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.authLoginMethod;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const rows = await this.userLoginAnalyticDomain.getLoginMethodMix(
            startDate ?? null,
            endDate ?? null
        );

        const result = {
            buckets: rows.map(r => ({
                key: r.action,
                count: r.count,
            })),
        };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    authLoginSource(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        return this.authLoginMethod(startDate, endDate);
    }

    async authLockout(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticLockoutMetrics> {
        const metric = EnumAnalyticDashboardMetric.authLockout;
        const cached = await this.readCache<IAnalyticLockoutMetrics>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const result = await this.userLoginAnalyticDomain.getLockoutMetrics(
            startDate,
            endDate
        );
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authSessionRevoke(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authSessionRevoke;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count =
            await this.activityLogAnalyticDomain.getCountByActionsInRange(
                [
                    EnumActivityLogAction.userRevokeSession,
                    EnumActivityLogAction.userRevokeSessionByAdmin,
                    EnumActivityLogAction.userRevokeAllSessions,
                    EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                ],
                startDate,
                endDate
            );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authConcurrentSessions(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.authConcurrent;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const rows = await this.sessionAnalyticDomain.getCountActiveByUser();

        const result = {
            buckets: rows.map(r => ({
                key: r.userId,
                count: r.count,
            })),
        };
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async authSessionsGeo(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.authSessionsGeo;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const rows = await this.sessionAnalyticDomain.getGroupByCountry(
            startDate,
            endDate
        );

        const result = { buckets: rows };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authSessionsUserAgent(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.authSessionsUa;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const sessions =
            await this.sessionAnalyticDomain.getActiveWithGeoInRange(
                startDate,
                endDate
            );
        const map = new Map<string, number>();
        for (const s of sessions) {
            const key =
                s.userAgent?.browser?.name ??
                s.userAgent?.os?.name ??
                'unknown';
            map.set(key, (map.get(key) ?? 0) + 1);
        }

        const result = {
            buckets: [...map.entries()].map(([key, count]) => ({
                key,
                count,
            })),
        };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authRefreshTokenVolume(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authRefresh;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count =
            await this.activityLogAnalyticDomain.getCountByActionsInRange(
                [EnumActivityLogAction.userRefreshToken],
                startDate,
                endDate
            );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authLogoutRate(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authLogout;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count =
            await this.activityLogAnalyticDomain.getCountByActionsInRange(
                [EnumActivityLogAction.userLogout],
                startDate,
                endDate
            );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authVerificationFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticVerificationFunnels> {
        const metric = EnumAnalyticDashboardMetric.authVerificationFunnel;
        const cached = await this.readCache<IAnalyticVerificationFunnels>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const [email, mobile] = await Promise.all([
            this.userVerificationAnalyticDomain.getFunnel(
                EnumVerificationType.email,
                startDate,
                endDate
            ),
            this.userVerificationAnalyticDomain.getFunnel(
                EnumVerificationType.mobileNumber,
                startDate,
                endDate
            ),
        ]);

        const result = { email, mobile };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authPasswordExpiry(): Promise<IAnalyticPasswordExpiry> {
        const metric = EnumAnalyticDashboardMetric.authPasswordExpiry;
        const cached = await this.readCache<IAnalyticPasswordExpiry>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const result =
            await this.userPasswordAnalyticDomain.getPasswordExpiryCompliance();
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async authPasswordChange(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authPasswordChange;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count =
            await this.userPasswordAnalyticDomain.getPasswordChangeCount(
                startDate,
                endDate
            );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authForgotPasswordConversion(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticForgotPasswordConversion> {
        const metric = EnumAnalyticDashboardMetric.authForgotConversion;
        const cached = await this.readCache<IAnalyticForgotPasswordConversion>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const result =
            await this.userForgotPasswordAnalyticDomain.getConversion(
                startDate,
                endDate
            );
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authAdminForcePassword(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authAdminForcePassword;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count =
            await this.userPasswordAnalyticDomain.getAdminForcePasswordCount(
                startDate,
                endDate
            );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authTwoFactorAdoption(): Promise<IAnalyticTwoFactorAdoption> {
        const metric = EnumAnalyticDashboardMetric.authTwoFactorAdoption;
        const cached = await this.readCache<IAnalyticTwoFactorAdoption>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const result = await this.userTwoFactorAnalyticDomain.getAdoption();
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async authTwoFactorAdminReset(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authTwoFactorAdminReset;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count = await this.userTwoFactorAnalyticDomain.getAdminResetCount(
            startDate,
            endDate
        );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authTwoFactorVerifySuccess(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authTwoFactorVerify;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count =
            await this.userTwoFactorAnalyticDomain.getVerifySuccessCount(
                startDate,
                endDate
            );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authBackupCodeRegeneration(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.authBackupCodeRegeneration;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count =
            await this.userTwoFactorAnalyticDomain.getBackupCodeRegenerationCount(
                startDate,
                endDate
            );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authTwoFactorAttempt(): Promise<IAnalyticTwoFactorAttemptSnapshot> {
        const metric = EnumAnalyticDashboardMetric.authTwoFactorAttempt;
        const cached = await this.readCache<IAnalyticTwoFactorAttemptSnapshot>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const result =
            await this.userTwoFactorAnalyticDomain.getAttemptSnapshot();
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async devicesRegistration(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.devicesRegistration;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count = await this.deviceAnalyticDomain.getCountRegistrations(
            startDate,
            endDate
        );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async devicesPlatform(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.devicesPlatform;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const rows = await this.deviceAnalyticDomain.getGroupByPlatform();

        const result = { buckets: rows };
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async devicesPushToken(): Promise<IAnalyticMetricRate> {
        const metric = EnumAnalyticDashboardMetric.devicesPushToken;
        const cached = await this.readCache<IAnalyticMetricRate>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const result = await this.deviceAnalyticDomain.getPushTokenRate();
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async devicesInfoRefresh(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.devicesInfoRefresh;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count =
            await this.activityLogAnalyticDomain.getCountByActionsInRange(
                [EnumActivityLogAction.userDeviceRefresh],
                startDate,
                endDate
            );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async devicesSessionRatio(): Promise<IAnalyticSessionDeviceRatio> {
        const metric = EnumAnalyticDashboardMetric.devicesSessionRatio;
        const cached = await this.readCache<IAnalyticSessionDeviceRatio>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const [sessions, devices] = await Promise.all([
            this.sessionAnalyticDomain.getCountActive(),
            this.deviceAnalyticDomain.getCountOwnerships(),
        ]);

        const result = {
            sessions,
            devices,
            ratio: devices === 0 ? 0 : sessions / devices,
        };
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async devicesPerUser(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.devicesPerUser;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const rows = await this.deviceAnalyticDomain.getCountPerUser();

        const result = {
            buckets: rows.map(r => ({
                key: r.userId,
                count: r.count,
            })),
        };
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async devicesInactivity(): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.devicesInactivity;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const now = this.helperDateService.create();
        const before = this.helperDateService.backward(
            now,
            Duration.fromObject({ days: 30 })
        );
        const rows = await this.deviceAnalyticDomain.getInactive(before);

        const result = { count: rows.length };
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async apiKeysLifecycle(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticApiKeyLifecycle> {
        const metric = EnumAnalyticDashboardMetric.apiKeysLifecycle;
        const cached = await this.readCache<IAnalyticApiKeyLifecycle>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const result = await this.apiKeyAnalyticDomain.getLifecycle(
            startDate,
            endDate
        );
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async apiKeysActiveExpired(): Promise<IAnalyticApiKeyActiveExpired> {
        const metric = EnumAnalyticDashboardMetric.apiKeysActiveExpired;
        const cached = await this.readCache<IAnalyticApiKeyActiveExpired>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const result = await this.apiKeyAnalyticDomain.getActiveExpired();
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async apiKeysTypeMix(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.apiKeysTypeMix;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const rows = await this.apiKeyAnalyticDomain.getTypeMix();

        const result = { buckets: rows };
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async termPoliciesAcceptanceRate(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceRate> {
        const metric = EnumAnalyticDashboardMetric.termPoliciesAcceptance;
        const cached = await this.readCache<IAnalyticTermPolicyAcceptanceRate>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const result =
            await this.termPolicyAcceptanceAnalyticDomain.getAcceptanceRate(
                startDate ?? null,
                endDate ?? null
            );
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async termPoliciesTimeToAccept(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyTimeToAccept> {
        const metric = EnumAnalyticDashboardMetric.termPoliciesTimeToAccept;
        const cached = await this.readCache<IAnalyticTermPolicyTimeToAccept>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const result =
            await this.termPolicyAcceptanceAnalyticDomain.getTimeToAccept(
                startDate ?? null,
                endDate ?? null
            );
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async workspacesCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        const metric = EnumAnalyticDashboardMetric.workspacesCreation;
        const cached = await this.readCache<IAnalyticMetricCount>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const count = await this.workspaceAnalyticDomain.getCountCreated(
            startDate,
            endDate
        );

        const result = { count };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async workspacesVisibility(): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.workspacesVisibility;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            null,
            null
        );
        if (cached) {
            return cached;
        }

        const rows = await this.workspaceAnalyticDomain.getGroupByVisibility();

        const result = { buckets: rows };
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async workspacesInviteFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        const metric = EnumAnalyticDashboardMetric.workspacesInviteFunnel;
        const cached = await this.readCache<IAnalyticStatusCount[]>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const result = await this.workspaceInviteAnalyticDomain.getFunnel(
            startDate,
            endDate,
            null
        );
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async workspacesJoinOutcomes(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        const metric = EnumAnalyticDashboardMetric.workspacesJoinOutcomes;
        const cached = await this.readCache<IAnalyticStatusCount[]>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const result =
            await this.workspaceJoinRequestAnalyticDomain.getOutcomes(
                startDate,
                endDate,
                null
            );
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async workspacesMembership(
        params: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const metric = this.pagedMetric(
            EnumAnalyticDashboardMetric.workspacesMembership,
            params
        );

        const cached = await this.readCache<
            IResponsePaginationReturn<IAnalyticWorkspaceCount>
        >(metric, null, null);
        if (cached) {
            return cached;
        }

        const result =
            await this.workspaceMemberAnalyticDomain.getMembershipDistributionOffset(
                params
            );
        await this.writeCache(metric, null, null, result);

        return result;
    }

    async workspacesActivityVolume(
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const metric = this.pagedMetric(
            EnumAnalyticDashboardMetric.workspacesActivity,
            params
        );

        const cached = await this.readCache<
            IResponsePaginationReturn<IAnalyticWorkspaceCount>
        >(metric, startDate, endDate);
        if (cached) {
            return cached;
        }

        const result =
            await this.activityLogAnalyticDomain.getGroupActivityByWorkspaceOffset(
                startDate,
                endDate,
                params
            );
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async projectsCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticProjectCreation> {
        const metric = EnumAnalyticDashboardMetric.projectsCreation;
        const cached = await this.readCache<IAnalyticProjectCreation>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const result = await this.projectAnalyticDomain.getCreation(
            startDate,
            endDate
        );
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async projectsMembership(
        params: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        const metric = this.pagedMetric(
            EnumAnalyticDashboardMetric.projectsMembership,
            params
        );

        const cached = await this.readCache<
            IResponsePaginationReturn<IAnalyticProjectCount>
        >(metric, null, null);
        if (cached) {
            return cached;
        }

        const result =
            await this.projectMemberAnalyticDomain.getMembershipDistributionOffset(
                params
            );
        await this.writeCache(metric, null, null, result);

        return result;
    }
}

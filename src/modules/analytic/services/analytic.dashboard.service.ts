import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
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
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { Duration } from 'luxon';

@Injectable()
export class AnalyticDashboardService {
    private readonly deviceInactivityInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly analyticCache: AnalyticCache,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticBucketUtil: AnalyticBucketUtil,
        private readonly helperDateService: HelperDateService,
        private readonly userAnalyticService: UserAnalyticService,
        private readonly userPasswordAnalyticService: UserPasswordAnalyticService,
        private readonly userForgotPasswordAnalyticService: UserForgotPasswordAnalyticService,
        private readonly userTwoFactorAnalyticService: UserTwoFactorAnalyticService,
        private readonly userVerificationAnalyticService: UserVerificationAnalyticService,
        private readonly userMobileNumberAnalyticService: UserMobileNumberAnalyticService,
        private readonly activityLogAnalyticService: ActivityLogAnalyticService,
        private readonly passwordHistoryAnalyticService: PasswordHistoryAnalyticService,
        private readonly sessionAnalyticService: SessionAnalyticService,
        private readonly deviceAnalyticService: DeviceAnalyticService,
        private readonly apiKeyAnalyticService: ApiKeyAnalyticService,
        private readonly termPolicyAcceptanceAnalyticService: TermPolicyAcceptanceAnalyticService,
        private readonly workspaceAnalyticService: WorkspaceAnalyticService,
        private readonly workspaceInviteAnalyticService: WorkspaceInviteAnalyticService,
        private readonly workspaceJoinRequestAnalyticService: WorkspaceJoinRequestAnalyticService,
        private readonly workspaceMemberAnalyticService: WorkspaceMemberAnalyticService,
        private readonly projectAnalyticService: ProjectAnalyticService,
        private readonly projectMemberAnalyticService: ProjectMemberAnalyticService
    ) {
        this.deviceInactivityInMs = this.configService.get<number>(
            'analytic.device.inactivityInMs'
        )!;
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

        const count = await this.userAnalyticService.getCountRegistrations(
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

        const result = await this.userAnalyticService.getChurnRate(
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
            this.activityLogAnalyticService.getCountByActionsInRange(
                [EnumActivityLogAction.userBlocked],
                startDate,
                endDate
            ),
            this.userAnalyticService.getCountByStatus(EnumUserStatus.blocked),
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

        const rows = await this.userAnalyticService.getGroupBySignUpWith(
            startDate,
            endDate
        );

        const buckets = this.analyticBucketUtil.toBuckets(rows, 'key');
        const result = { buckets };
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

        const rows = await this.userAnalyticService.getGroupBySignUpFrom(
            startDate,
            endDate
        );

        const buckets = this.analyticBucketUtil.toBuckets(rows, 'key');
        const result = { buckets };
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

        const result = await this.userAnalyticService.getEmailVerificationRate(
            startDate,
            endDate
        );
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
            await this.userMobileNumberAnalyticService.getVerificationRate(
                startDate,
                endDate
            );
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

        const rows = await this.userAnalyticService.getGroupByStatus();

        const buckets = this.analyticBucketUtil.toBuckets(rows, 'key');
        const result = { buckets };
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

        const rows = await this.userAnalyticService.getGroupByCountry();

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

        const rows = await this.userAnalyticService.getGroupByRole();

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
            await this.activityLogAnalyticService.getCountByActionsInRange(
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
            await this.activityLogAnalyticService.getCountByActionsInRange(
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

        const [added, updated, deleted] = await Promise.all([
            this.activityLogAnalyticService.getCountByActionsInRange(
                [EnumActivityLogAction.userAddMobileNumber],
                startDate,
                endDate
            ),
            this.activityLogAnalyticService.getCountByActionsInRange(
                [EnumActivityLogAction.userUpdateMobileNumber],
                startDate,
                endDate
            ),
            this.activityLogAnalyticService.getCountByActionsInRange(
                [EnumActivityLogAction.userDeleteMobileNumber],
                startDate,
                endDate
            ),
        ]);

        const result = { added, updated, deleted };
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

        const count =
            await this.activityLogAnalyticService.getCountByActionsInRange(
                UserLoginAnalyticActions,
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

        const rows =
            await this.activityLogAnalyticService.getGroupByActionInRange(
                UserLoginAnalyticActions,
                startDate,
                endDate
            );

        const buckets = this.analyticBucketUtil.toBuckets(rows, 'action');
        const result = { buckets };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async authLoginSource(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        const metric = EnumAnalyticDashboardMetric.authLoginSource;
        const cached = await this.readCache<IAnalyticBucketsResult>(
            metric,
            startDate,
            endDate
        );
        if (cached) {
            return cached;
        }

        const rows = await this.userAnalyticService.getGroupLoginSource(
            startDate,
            endDate
        );

        const buckets = this.analyticBucketUtil.toBuckets(rows, 'key');
        const result = { buckets };
        await this.writeCache(metric, startDate, endDate, result);

        return result;
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

        const [failed, maxAttempt] = await Promise.all([
            this.activityLogAnalyticService.getCountByActionsInRange(
                [EnumActivityLogAction.userLoginFailed],
                startDate,
                endDate
            ),
            this.activityLogAnalyticService.getCountByActionsInRange(
                [
                    EnumActivityLogAction.userReachMaxPasswordAttempt,
                    EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                ],
                startDate,
                endDate
            ),
        ]);

        const result = { failed, maxAttempt };
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
            await this.activityLogAnalyticService.getCountByActionsInRange(
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

        const now = this.helperDateService.create();
        const rows =
            await this.sessionAnalyticService.getCountActiveByUser(now);

        const buckets = this.analyticBucketUtil.toBucketsByCountRange(rows);
        const result = { buckets };
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

        const now = this.helperDateService.create();
        const rows = await this.sessionAnalyticService.getGroupByCountry(
            startDate,
            endDate,
            now
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

        const now = this.helperDateService.create();
        const sessions = await this.sessionAnalyticService.getActiveInRange(
            startDate,
            endDate,
            now
        );

        const buckets = this.analyticBucketUtil.toBucketsByBrowser(sessions);
        const result = { buckets };
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
            await this.activityLogAnalyticService.getCountByActionsInRange(
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
            await this.activityLogAnalyticService.getCountByActionsInRange(
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
            this.userVerificationAnalyticService.getFunnel(
                EnumVerificationType.email,
                startDate,
                endDate
            ),
            this.userVerificationAnalyticService.getFunnel(
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

        const [activeUserCount, expired] = await Promise.all([
            this.userAnalyticService.getCountActive(),
            this.userPasswordAnalyticService.getExpiredCount(),
        ]);
        const result = this.userPasswordAnalyticService.mapExpiryCompliance(
            expired,
            activeUserCount
        );
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
            await this.passwordHistoryAnalyticService.getCountByTypeInRange(
                EnumPasswordHistoryType.profile,
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
            await this.userForgotPasswordAnalyticService.getConversion(
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
            await this.passwordHistoryAnalyticService.getCountByTypeInRange(
                EnumPasswordHistoryType.admin,
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

        const [activeUserCount, enabled] = await Promise.all([
            this.userAnalyticService.getCountActive(),
            this.userTwoFactorAnalyticService.getEnabledCount(),
        ]);
        const result = this.userTwoFactorAnalyticService.mapAdoption(
            enabled,
            activeUserCount
        );
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

        const count =
            await this.activityLogAnalyticService.getCountByActionsInRange(
                [EnumActivityLogAction.userResetTwoFactorByAdmin],
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
            await this.activityLogAnalyticService.getCountByActionsInRange(
                [EnumActivityLogAction.userVerifyTwoFactor],
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
            await this.activityLogAnalyticService.getCountByActionsInRange(
                [EnumActivityLogAction.userRegenerateTwoFactorBackupCodes],
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
            await this.userTwoFactorAnalyticService.getAttemptSnapshot();
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

        const count = await this.deviceAnalyticService.getCountRegistrations(
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

        const rows = await this.deviceAnalyticService.getGroupByPlatform();

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

        const result = await this.deviceAnalyticService.getPushTokenRate();
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
            await this.activityLogAnalyticService.getCountByActionsInRange(
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

        const now = this.helperDateService.create();
        const [sessions, devices] = await Promise.all([
            this.sessionAnalyticService.getCountActive(now),
            this.deviceAnalyticService.getCountOwnerships(),
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

        const rows = await this.deviceAnalyticService.getCountPerUser();

        const buckets = this.analyticBucketUtil.toBucketsByCountRange(rows);
        const result = { buckets };
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
            Duration.fromMillis(this.deviceInactivityInMs)
        );
        const count = await this.deviceAnalyticService.getCountInactive(before);

        const result = { count };
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

        const [created, reset, updated, deleted] = await Promise.all([
            this.activityLogAnalyticService.getCountByActionsInRange(
                [EnumActivityLogAction.adminApiKeyCreate],
                startDate,
                endDate
            ),
            this.activityLogAnalyticService.getCountByActionsInRange(
                [EnumActivityLogAction.adminApiKeyReset],
                startDate,
                endDate
            ),
            this.activityLogAnalyticService.getCountByActionsInRange(
                [
                    EnumActivityLogAction.adminApiKeyUpdate,
                    EnumActivityLogAction.adminApiKeyUpdateDate,
                    EnumActivityLogAction.adminApiKeyUpdateStatus,
                ],
                startDate,
                endDate
            ),
            this.activityLogAnalyticService.getCountByActionsInRange(
                [EnumActivityLogAction.adminApiKeyDelete],
                startDate,
                endDate
            ),
        ]);

        const result = { created, reset, updated, deleted };
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

        const now = this.helperDateService.create();
        const result = await this.apiKeyAnalyticService.getActiveExpired(now);
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

        const rows = await this.apiKeyAnalyticService.getTypeMix();

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

        const activeUserCount = await this.userAnalyticService.getCountActive();
        const result =
            await this.termPolicyAcceptanceAnalyticService.getAcceptanceRate(
                activeUserCount,
                startDate,
                endDate
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
            await this.termPolicyAcceptanceAnalyticService.getTimeToAccept(
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

        const count = await this.workspaceAnalyticService.getCountCreated(
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

        const rows = await this.workspaceAnalyticService.getGroupByVisibility();

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

        const result = await this.workspaceInviteAnalyticService.getFunnel(
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
            await this.workspaceJoinRequestAnalyticService.getOutcomes(
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
        const metric = this.analyticDateUtil.pagedMetricToken(
            EnumAnalyticDashboardMetric.workspacesMembership,
            params.skip,
            params.limit
        );

        const cached = await this.readCache<
            IResponsePaginationReturn<IAnalyticWorkspaceCount>
        >(metric, null, null);
        if (cached) {
            return cached;
        }

        const result =
            await this.workspaceMemberAnalyticService.getMembershipDistributionOffset(
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
        const metric = this.analyticDateUtil.pagedMetricToken(
            EnumAnalyticDashboardMetric.workspacesActivity,
            params.skip,
            params.limit
        );

        const cached = await this.readCache<
            IResponsePaginationReturn<IAnalyticWorkspaceCount>
        >(metric, startDate, endDate);
        if (cached) {
            return cached;
        }

        const result =
            await this.activityLogAnalyticService.getGroupActivityByWorkspaceOffset(
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

        const result = await this.projectAnalyticService.getCreation(
            startDate,
            endDate
        );
        await this.writeCache(metric, startDate, endDate, result);

        return result;
    }

    async projectsMembership(
        params: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        const metric = this.analyticDateUtil.pagedMetricToken(
            EnumAnalyticDashboardMetric.projectsMembership,
            params.skip,
            params.limit
        );

        const cached = await this.readCache<
            IResponsePaginationReturn<IAnalyticProjectCount>
        >(metric, null, null);
        if (cached) {
            return cached;
        }

        const result =
            await this.projectMemberAnalyticService.getMembershipDistributionOffset(
                params
            );
        await this.writeCache(metric, null, null, result);

        return result;
    }
}

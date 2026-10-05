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

    private async cached<T>(
        metric: string,
        start: Date | null,
        end: Date | null,
        compute: () => Promise<T>
    ): Promise<T> {
        const s = this.analyticDateUtil.cacheToken(start);
        const e = this.analyticDateUtil.cacheToken(end);
        const hit = await this.analyticCache.getDashboard<T>(metric, s, e);
        if (hit) {
            return hit;
        }
        const value = await compute();
        await this.analyticCache.setDashboard(metric, s, e, value);
        return value;
    }

    usersRegistrations(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersRegistrations,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.userAnalyticDomain.getCountRegistrations(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    usersChurn(startDate: Date, endDate: Date): Promise<IAnalyticMetricRate> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersChurn,
            startDate,
            endDate,
            () => this.userAnalyticDomain.getChurnRate(startDate, endDate)
        );
    }

    usersBlocked(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBlockedUsers> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersBlocked,
            startDate,
            endDate,
            async () => {
                const [trend, current] = await Promise.all([
                    this.activityLogAnalyticDomain.getCountByActionsInRange(
                        [EnumActivityLogAction.userBlocked],
                        startDate,
                        endDate
                    ),
                    this.userAnalyticDomain.getCountByStatus(
                        EnumUserStatus.blocked
                    ),
                ]);
                return { trend, current };
            }
        );
    }

    usersSignUpWith(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersSignUpWith,
            startDate,
            endDate,
            async () => {
                const rows = await this.userAnalyticDomain.getGroupBySignUpWith(
                    startDate,
                    endDate
                );
                return {
                    buckets: rows.map(r => ({
                        key: String(r.key),
                        count: r.count,
                    })),
                };
            }
        );
    }

    usersSignUpFrom(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersSignUpFrom,
            startDate,
            endDate,
            async () => {
                const rows = await this.userAnalyticDomain.getGroupBySignUpFrom(
                    startDate,
                    endDate
                );
                return {
                    buckets: rows.map(r => ({
                        key: String(r.key),
                        count: r.count,
                    })),
                };
            }
        );
    }

    usersEmailVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticMetricRate> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersEmailVerification,
            startDate,
            endDate,
            () => this.userAnalyticDomain.getEmailVerificationRate()
        );
    }

    usersMobileVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticMetricRate> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersMobileVerification,
            startDate,
            endDate,
            () => this.userMobileNumberAnalyticDomain.getVerificationRate()
        );
    }

    usersStatusDistribution(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersStatus,
            null,
            null,
            async () => {
                const rows = await this.userAnalyticDomain.getGroupByStatus();
                return {
                    buckets: rows.map(r => ({
                        key: String(r.key),
                        count: r.count,
                    })),
                };
            }
        );
    }

    usersCountryDistribution(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersCountry,
            null,
            null,
            async () => {
                const rows = await this.userAnalyticDomain.getGroupByCountry();
                return { buckets: rows };
            }
        );
    }

    usersRoleDistribution(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersRole,
            null,
            null,
            async () => {
                const rows = await this.userAnalyticDomain.getGroupByRole();
                return { buckets: rows };
            }
        );
    }

    usersSelfDelete(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersSelfDelete,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.activityLogAnalyticDomain.getCountByActionsInRange(
                        [EnumActivityLogAction.userDeleteSelf],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    usersClaimUsername(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersClaimUsername,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.activityLogAnalyticDomain.getCountByActionsInRange(
                        [EnumActivityLogAction.userClaimUsername],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    usersMobileChurn(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMobileChurn> {
        return this.cached(
            EnumAnalyticDashboardMetric.usersMobileChurn,
            startDate,
            endDate,
            () =>
                this.userMobileNumberAnalyticDomain.getChurn(startDate, endDate)
        );
    }

    authLoginFrequency(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.authLoginFrequency,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.userLoginAnalyticDomain.getLoginFrequency(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authLoginMethod(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.authLoginMethod,
            startDate,
            endDate,
            async () => {
                const rows =
                    await this.userLoginAnalyticDomain.getLoginMethodMix(
                        startDate ?? null,
                        endDate ?? null
                    );
                return {
                    buckets: rows.map(r => ({
                        key: r.action,
                        count: r.count,
                    })),
                };
            }
        );
    }

    authLoginSource(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        return this.authLoginMethod(startDate, endDate);
    }

    authLockout(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticLockoutMetrics> {
        return this.cached(
            EnumAnalyticDashboardMetric.authLockout,
            startDate,
            endDate,
            () =>
                this.userLoginAnalyticDomain.getLockoutMetrics(
                    startDate,
                    endDate
                )
        );
    }

    authSessionRevoke(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.authSessionRevoke,
            startDate,
            endDate,
            async () => {
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

                return { count };
            }
        );
    }

    authConcurrentSessions(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.authConcurrent,
            null,
            null,
            async () => {
                const rows =
                    await this.sessionAnalyticDomain.getCountActiveByUser();
                return {
                    buckets: rows.map(r => ({
                        key: r.userId,
                        count: r.count,
                    })),
                };
            }
        );
    }

    authSessionsGeo(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.authSessionsGeo,
            startDate,
            endDate,
            async () => {
                const rows = await this.sessionAnalyticDomain.getGroupByCountry(
                    startDate,
                    endDate
                );
                return { buckets: rows };
            }
        );
    }

    authSessionsUserAgent(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.authSessionsUa,
            startDate,
            endDate,
            async () => {
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
                return {
                    buckets: [...map.entries()].map(([key, count]) => ({
                        key,
                        count,
                    })),
                };
            }
        );
    }

    authRefreshTokenVolume(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.authRefresh,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.activityLogAnalyticDomain.getCountByActionsInRange(
                        [EnumActivityLogAction.userRefreshToken],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authLogoutRate(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.authLogout,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.activityLogAnalyticDomain.getCountByActionsInRange(
                        [EnumActivityLogAction.userLogout],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authVerificationFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticVerificationFunnels> {
        return this.cached(
            EnumAnalyticDashboardMetric.authVerificationFunnel,
            startDate,
            endDate,
            async () => {
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
                return { email, mobile };
            }
        );
    }

    authPasswordExpiry(): Promise<IAnalyticPasswordExpiry> {
        return this.cached(
            EnumAnalyticDashboardMetric.authPasswordExpiry,
            null,
            null,
            () => this.userPasswordAnalyticDomain.getPasswordExpiryCompliance()
        );
    }

    authPasswordChange(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.authPasswordChange,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.userPasswordAnalyticDomain.getPasswordChangeCount(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authForgotPasswordConversion(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticForgotPasswordConversion> {
        return this.cached(
            EnumAnalyticDashboardMetric.authForgotConversion,
            startDate,
            endDate,
            () =>
                this.userForgotPasswordAnalyticDomain.getConversion(
                    startDate,
                    endDate
                )
        );
    }

    authAdminForcePassword(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.authAdminForcePassword,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.userPasswordAnalyticDomain.getAdminForcePasswordCount(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authTwoFactorAdoption(): Promise<IAnalyticTwoFactorAdoption> {
        return this.cached(
            EnumAnalyticDashboardMetric.authTwoFactorAdoption,
            null,
            null,
            () => this.userTwoFactorAnalyticDomain.getAdoption()
        );
    }

    authTwoFactorAdminReset(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.authTwoFactorAdminReset,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.userTwoFactorAnalyticDomain.getAdminResetCount(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authTwoFactorVerifySuccess(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.authTwoFactorVerify,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.userTwoFactorAnalyticDomain.getVerifySuccessCount(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authBackupCodeRegeneration(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.authBackupCodeRegeneration,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.userTwoFactorAnalyticDomain.getBackupCodeRegenerationCount(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    authTwoFactorAttempt(): Promise<IAnalyticTwoFactorAttemptSnapshot> {
        return this.cached(
            EnumAnalyticDashboardMetric.authTwoFactorAttempt,
            null,
            null,
            () => this.userTwoFactorAnalyticDomain.getAttemptSnapshot()
        );
    }

    devicesRegistration(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.devicesRegistration,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.deviceAnalyticDomain.getCountRegistrations(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    devicesPlatform(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.devicesPlatform,
            null,
            null,
            async () => {
                const rows =
                    await this.deviceAnalyticDomain.getGroupByPlatform();
                return { buckets: rows };
            }
        );
    }

    devicesPushToken(): Promise<IAnalyticMetricRate> {
        return this.cached(
            EnumAnalyticDashboardMetric.devicesPushToken,
            null,
            null,
            () => this.deviceAnalyticDomain.getPushTokenRate()
        );
    }

    devicesInfoRefresh(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.devicesInfoRefresh,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.activityLogAnalyticDomain.getCountByActionsInRange(
                        [EnumActivityLogAction.userDeviceRefresh],
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    devicesSessionRatio(): Promise<IAnalyticSessionDeviceRatio> {
        return this.cached(
            EnumAnalyticDashboardMetric.devicesSessionRatio,
            null,
            null,
            async () => {
                const [sessions, devices] = await Promise.all([
                    this.sessionAnalyticDomain.getCountActive(),
                    this.deviceAnalyticDomain.getCountOwnerships(),
                ]);
                return {
                    sessions,
                    devices,
                    ratio: devices === 0 ? 0 : sessions / devices,
                };
            }
        );
    }

    devicesPerUser(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.devicesPerUser,
            null,
            null,
            async () => {
                const rows = await this.deviceAnalyticDomain.getCountPerUser();
                return {
                    buckets: rows.map(r => ({
                        key: r.userId,
                        count: r.count,
                    })),
                };
            }
        );
    }

    devicesInactivity(): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.devicesInactivity,
            null,
            null,
            async () => {
                const now = this.helperDateService.create();
                const before = this.helperDateService.backward(
                    now,
                    Duration.fromObject({ days: 30 })
                );
                const rows =
                    await this.deviceAnalyticDomain.getInactive(before);
                return { count: rows.length };
            }
        );
    }

    apiKeysLifecycle(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticApiKeyLifecycle> {
        return this.cached(
            EnumAnalyticDashboardMetric.apiKeysLifecycle,
            startDate,
            endDate,
            () => this.apiKeyAnalyticDomain.getLifecycle(startDate, endDate)
        );
    }

    apiKeysActiveExpired(): Promise<IAnalyticApiKeyActiveExpired> {
        return this.cached(
            EnumAnalyticDashboardMetric.apiKeysActiveExpired,
            null,
            null,
            () => this.apiKeyAnalyticDomain.getActiveExpired()
        );
    }

    apiKeysTypeMix(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.apiKeysTypeMix,
            null,
            null,
            async () => {
                const rows = await this.apiKeyAnalyticDomain.getTypeMix();
                return { buckets: rows };
            }
        );
    }

    termPoliciesAcceptanceRate(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceRate> {
        return this.cached(
            EnumAnalyticDashboardMetric.termPoliciesAcceptance,
            startDate,
            endDate,
            () =>
                this.termPolicyAcceptanceAnalyticDomain.getAcceptanceRate(
                    startDate ?? null,
                    endDate ?? null
                )
        );
    }

    termPoliciesTimeToAccept(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyTimeToAccept> {
        return this.cached(
            EnumAnalyticDashboardMetric.termPoliciesTimeToAccept,
            startDate,
            endDate,
            () =>
                this.termPolicyAcceptanceAnalyticDomain.getTimeToAccept(
                    startDate ?? null,
                    endDate ?? null
                )
        );
    }

    workspacesCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricCount> {
        return this.cached(
            EnumAnalyticDashboardMetric.workspacesCreation,
            startDate,
            endDate,
            async () => {
                const count =
                    await this.workspaceAnalyticDomain.getCountCreated(
                        startDate,
                        endDate
                    );

                return { count };
            }
        );
    }

    workspacesVisibility(): Promise<IAnalyticBucketsResult> {
        return this.cached(
            EnumAnalyticDashboardMetric.workspacesVisibility,
            null,
            null,
            async () => {
                const rows =
                    await this.workspaceAnalyticDomain.getGroupByVisibility();
                return { buckets: rows };
            }
        );
    }

    workspacesInviteFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        return this.cached(
            EnumAnalyticDashboardMetric.workspacesInviteFunnel,
            startDate,
            endDate,
            () =>
                this.workspaceInviteAnalyticDomain.getFunnel(
                    startDate,
                    endDate,
                    null
                )
        );
    }

    workspacesJoinOutcomes(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticStatusCount[]> {
        return this.cached(
            EnumAnalyticDashboardMetric.workspacesJoinOutcomes,
            startDate,
            endDate,
            () =>
                this.workspaceJoinRequestAnalyticDomain.getOutcomes(
                    startDate,
                    endDate,
                    null
                )
        );
    }

    workspacesMembership(
        params: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const metric = this.pagedMetric(
            EnumAnalyticDashboardMetric.workspacesMembership,
            params
        );

        return this.cached(metric, null, null, () =>
            this.workspaceMemberAnalyticDomain.getMembershipDistributionOffset(
                params
            )
        );
    }

    workspacesActivityVolume(
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const metric = this.pagedMetric(
            EnumAnalyticDashboardMetric.workspacesActivity,
            params
        );

        return this.cached(metric, startDate, endDate, () =>
            this.activityLogAnalyticDomain.getGroupActivityByWorkspaceOffset(
                startDate,
                endDate,
                params
            )
        );
    }

    projectsCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticProjectCreation> {
        return this.cached(
            EnumAnalyticDashboardMetric.projectsCreation,
            startDate,
            endDate,
            () => this.projectAnalyticDomain.getCreation(startDate, endDate)
        );
    }

    projectsMembership(
        params: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        const metric = this.pagedMetric(
            EnumAnalyticDashboardMetric.projectsMembership,
            params
        );

        return this.cached(metric, null, null, () =>
            this.projectMemberAnalyticDomain.getMembershipDistributionOffset(
                params
            )
        );
    }
}

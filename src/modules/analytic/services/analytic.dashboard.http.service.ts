import { AnalyticDashboardDomain } from '@modules/analytic/domains/analytic.dashboard.domain';
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
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticDashboardHttpService {
    constructor(
        private readonly analyticDashboardDomain: AnalyticDashboardDomain,
        private readonly analyticDateUtil: AnalyticDateUtil
    ) {}

    usersRegistrations(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.usersRegistrations(
            range.startDate,
            range.endDate
        );
    }

    usersChurn(startDate?: Date, endDate?: Date): Promise<IAnalyticMetricRate> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.usersChurn(
            range.startDate,
            range.endDate
        );
    }

    usersBlocked(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBlockedUsers> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.usersBlocked(
            range.startDate,
            range.endDate
        );
    }

    usersSignUpWith(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBucketsResult> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticDashboardDomain.usersSignUpWith(
            range.startDate,
            range.endDate
        );
    }

    usersSignUpFrom(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBucketsResult> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticDashboardDomain.usersSignUpFrom(
            range.startDate,
            range.endDate
        );
    }

    usersEmailVerification(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricRate> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticDashboardDomain.usersEmailVerification(
            range.startDate,
            range.endDate
        );
    }

    usersMobileVerification(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricRate> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticDashboardDomain.usersMobileVerification(
            range.startDate,
            range.endDate
        );
    }

    usersStatusDistribution(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardDomain.usersStatusDistribution();
    }

    usersCountryDistribution(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardDomain.usersCountryDistribution();
    }

    usersRoleDistribution(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardDomain.usersRoleDistribution();
    }

    usersSelfDelete(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.usersSelfDelete(
            range.startDate,
            range.endDate
        );
    }

    usersClaimUsername(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.usersClaimUsername(
            range.startDate,
            range.endDate
        );
    }

    usersMobileChurn(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMobileChurn> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.usersMobileChurn(
            range.startDate,
            range.endDate
        );
    }

    authLoginFrequency(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.authLoginFrequency(
            range.startDate,
            range.endDate
        );
    }

    authLoginMethod(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBucketsResult> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticDashboardDomain.authLoginMethod(
            range.startDate,
            range.endDate
        );
    }

    authLoginSource(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBucketsResult> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticDashboardDomain.authLoginSource(
            range.startDate,
            range.endDate
        );
    }

    authLockout(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticLockoutMetrics> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.authLockout(
            range.startDate,
            range.endDate
        );
    }

    authSessionRevoke(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.authSessionRevoke(
            range.startDate,
            range.endDate
        );
    }

    authConcurrentSessions(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardDomain.authConcurrentSessions();
    }

    authSessionsGeo(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBucketsResult> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticDashboardDomain.authSessionsGeo(
            range.startDate,
            range.endDate
        );
    }

    authSessionsUserAgent(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticBucketsResult> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticDashboardDomain.authSessionsUserAgent(
            range.startDate,
            range.endDate
        );
    }

    authRefreshTokenVolume(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.authRefreshTokenVolume(
            range.startDate,
            range.endDate
        );
    }

    authLogoutRate(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.authLogoutRate(
            range.startDate,
            range.endDate
        );
    }

    authVerificationFunnel(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticVerificationFunnels> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.authVerificationFunnel(
            range.startDate,
            range.endDate
        );
    }

    authPasswordExpiry(): Promise<IAnalyticPasswordExpiry> {
        return this.analyticDashboardDomain.authPasswordExpiry();
    }

    authPasswordChange(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.authPasswordChange(
            range.startDate,
            range.endDate
        );
    }

    authForgotPasswordConversion(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticForgotPasswordConversion> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.authForgotPasswordConversion(
            range.startDate,
            range.endDate
        );
    }

    authAdminForcePassword(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.authAdminForcePassword(
            range.startDate,
            range.endDate
        );
    }

    authTwoFactorAdoption(): Promise<IAnalyticTwoFactorAdoption> {
        return this.analyticDashboardDomain.authTwoFactorAdoption();
    }

    authTwoFactorAdminReset(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.authTwoFactorAdminReset(
            range.startDate,
            range.endDate
        );
    }

    authTwoFactorVerifySuccess(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.authTwoFactorVerifySuccess(
            range.startDate,
            range.endDate
        );
    }

    authBackupCodeRegen(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.authBackupCodeRegen(
            range.startDate,
            range.endDate
        );
    }

    authTwoFactorAttempt(): Promise<IAnalyticTwoFactorAttemptSnapshot> {
        return this.analyticDashboardDomain.authTwoFactorAttempt();
    }

    devicesRegistration(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.devicesRegistration(
            range.startDate,
            range.endDate
        );
    }

    devicesPlatform(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardDomain.devicesPlatform();
    }

    devicesPushToken(): Promise<IAnalyticMetricRate> {
        return this.analyticDashboardDomain.devicesPushToken();
    }

    devicesInfoRefresh(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.devicesInfoRefresh(
            range.startDate,
            range.endDate
        );
    }

    devicesSessionRatio(): Promise<IAnalyticSessionDeviceRatio> {
        return this.analyticDashboardDomain.devicesSessionRatio();
    }

    devicesPerUser(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardDomain.devicesPerUser();
    }

    devicesInactivity(): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardDomain.devicesInactivity();
    }

    apiKeysLifecycle(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticApiKeyLifecycle> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.apiKeysLifecycle(
            range.startDate,
            range.endDate
        );
    }

    apiKeysActiveExpired(): Promise<IAnalyticApiKeyActiveExpired> {
        return this.analyticDashboardDomain.apiKeysActiveExpired();
    }

    apiKeysTypeMix(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardDomain.apiKeysTypeMix();
    }

    termPoliciesAcceptanceRate(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticTermPolicyAcceptanceRate> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticDashboardDomain.termPoliciesAcceptanceRate(
            range.startDate,
            range.endDate
        );
    }

    termPoliciesTimeToAccept(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticTermPolicyTimeToAccept> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticDashboardDomain.termPoliciesTimeToAccept(
            range.startDate,
            range.endDate
        );
    }

    workspacesCreation(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticMetricCount> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.workspacesCreation(
            range.startDate,
            range.endDate
        );
    }

    workspacesVisibility(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardDomain.workspacesVisibility();
    }

    workspacesInviteFunnel(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticStatusCount[]> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.workspacesInviteFunnel(
            range.startDate,
            range.endDate
        );
    }

    workspacesJoinOutcomes(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticStatusCount[]> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.workspacesJoinOutcomes(
            range.startDate,
            range.endDate
        );
    }

    workspacesMembership(): Promise<IAnalyticWorkspaceCount[]> {
        return this.analyticDashboardDomain.workspacesMembership();
    }

    workspacesActivityVolume(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticWorkspaceCount[]> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.workspacesActivityVolume(
            range.startDate,
            range.endDate
        );
    }

    projectsCreation(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticProjectCreation> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticDashboardDomain.projectsCreation(
            range.startDate,
            range.endDate
        );
    }

    projectsMembership(): Promise<IAnalyticProjectCount[]> {
        return this.analyticDashboardDomain.projectsMembership();
    }
}

import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
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
    IAnalyticStatusCountList,
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticTermPolicyTimeToAccept,
    IAnalyticTwoFactorAdoption,
    IAnalyticTwoFactorAttemptSnapshot,
    IAnalyticVerificationFunnels,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticDashboardHttpService {
    constructor(
        private readonly analyticDashboardDomain: AnalyticDashboardDomain,
        private readonly analyticDateDomain: AnalyticDateDomain
    ) {}

    async usersRegistrations(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersRegistrations(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersChurn(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersChurn(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersBlocked(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticBlockedUsers>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersBlocked(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersSignUpWith(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersSignUpWith(
            range.startDate ?? undefined,
            range.endDate ?? undefined
        );

        return { data };
    }

    async usersSignUpFrom(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersSignUpFrom(
            range.startDate ?? undefined,
            range.endDate ?? undefined
        );

        return { data };
    }

    async usersEmailVerification(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersEmailVerification(
            range.startDate ?? undefined,
            range.endDate ?? undefined
        );

        return { data };
    }

    async usersMobileVerification(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersMobileVerification(
            range.startDate ?? undefined,
            range.endDate ?? undefined
        );

        return { data };
    }

    async usersStatusDistribution(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        const data =
            await this.analyticDashboardDomain.usersStatusDistribution();

        return { data };
    }

    async usersCountryDistribution(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        const data =
            await this.analyticDashboardDomain.usersCountryDistribution();

        return { data };
    }

    async usersRoleDistribution(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        const data = await this.analyticDashboardDomain.usersRoleDistribution();

        return { data };
    }

    async usersSelfDelete(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersSelfDelete(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersClaimUsername(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersClaimUsername(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersMobileChurn(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMobileChurn>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersMobileChurn(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authLoginFrequency(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authLoginFrequency(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authLoginMethod(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authLoginMethod(
            range.startDate ?? undefined,
            range.endDate ?? undefined
        );

        return { data };
    }

    async authLoginSource(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authLoginSource(
            range.startDate ?? undefined,
            range.endDate ?? undefined
        );

        return { data };
    }

    async authLockout(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticLockoutMetrics>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authLockout(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authSessionRevoke(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authSessionRevoke(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authConcurrentSessions(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        const data =
            await this.analyticDashboardDomain.authConcurrentSessions();

        return { data };
    }

    async authSessionsGeo(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authSessionsGeo(
            range.startDate ?? undefined,
            range.endDate ?? undefined
        );

        return { data };
    }

    async authSessionsUserAgent(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authSessionsUserAgent(
            range.startDate ?? undefined,
            range.endDate ?? undefined
        );

        return { data };
    }

    async authRefreshTokenVolume(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authRefreshTokenVolume(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authLogoutRate(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authLogoutRate(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authVerificationFunnel(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticVerificationFunnels>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authVerificationFunnel(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authPasswordExpiry(): Promise<
        IResponseReturn<IAnalyticPasswordExpiry>
    > {
        const data = await this.analyticDashboardDomain.authPasswordExpiry();

        return { data };
    }

    async authPasswordChange(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authPasswordChange(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authForgotPasswordConversion(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticForgotPasswordConversion>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data =
            await this.analyticDashboardDomain.authForgotPasswordConversion(
                range.startDate,
                range.endDate
            );

        return { data };
    }

    async authAdminForcePassword(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authAdminForcePassword(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authTwoFactorAdoption(): Promise<
        IResponseReturn<IAnalyticTwoFactorAdoption>
    > {
        const data = await this.analyticDashboardDomain.authTwoFactorAdoption();

        return { data };
    }

    async authTwoFactorAdminReset(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authTwoFactorAdminReset(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authTwoFactorVerifySuccess(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data =
            await this.analyticDashboardDomain.authTwoFactorVerifySuccess(
                range.startDate,
                range.endDate
            );

        return { data };
    }

    async authBackupCodeRegeneration(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data =
            await this.analyticDashboardDomain.authBackupCodeRegeneration(
                range.startDate,
                range.endDate
            );

        return { data };
    }

    async authTwoFactorAttempt(): Promise<
        IResponseReturn<IAnalyticTwoFactorAttemptSnapshot>
    > {
        const data = await this.analyticDashboardDomain.authTwoFactorAttempt();

        return { data };
    }

    async devicesRegistration(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.devicesRegistration(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async devicesPlatform(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const data = await this.analyticDashboardDomain.devicesPlatform();

        return { data };
    }

    async devicesPushToken(): Promise<IResponseReturn<IAnalyticMetricRate>> {
        const data = await this.analyticDashboardDomain.devicesPushToken();

        return { data };
    }

    async devicesInfoRefresh(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.devicesInfoRefresh(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async devicesSessionRatio(): Promise<
        IResponseReturn<IAnalyticSessionDeviceRatio>
    > {
        const data = await this.analyticDashboardDomain.devicesSessionRatio();

        return { data };
    }

    async devicesPerUser(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const data = await this.analyticDashboardDomain.devicesPerUser();

        return { data };
    }

    async devicesInactivity(): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const data = await this.analyticDashboardDomain.devicesInactivity();

        return { data };
    }

    async apiKeysLifecycle(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticApiKeyLifecycle>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.apiKeysLifecycle(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async apiKeysActiveExpired(): Promise<
        IResponseReturn<IAnalyticApiKeyActiveExpired>
    > {
        const data = await this.analyticDashboardDomain.apiKeysActiveExpired();

        return { data };
    }

    async apiKeysTypeMix(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const data = await this.analyticDashboardDomain.apiKeysTypeMix();

        return { data };
    }

    async termPoliciesAcceptanceRate(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticTermPolicyAcceptanceRate>> {
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data =
            await this.analyticDashboardDomain.termPoliciesAcceptanceRate(
                range.startDate ?? undefined,
                range.endDate ?? undefined
            );

        return { data };
    }

    async termPoliciesTimeToAccept(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticTermPolicyTimeToAccept>> {
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data =
            await this.analyticDashboardDomain.termPoliciesTimeToAccept(
                range.startDate ?? undefined,
                range.endDate ?? undefined
            );

        return { data };
    }

    async workspacesCreation(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.workspacesCreation(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async workspacesVisibility(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        const data = await this.analyticDashboardDomain.workspacesVisibility();

        return { data };
    }

    async workspacesInviteFunnel(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const statuses =
            await this.analyticDashboardDomain.workspacesInviteFunnel(
                range.startDate,
                range.endDate
            );

        return { data: { statuses } };
    }

    async workspacesJoinOutcomes(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const statuses =
            await this.analyticDashboardDomain.workspacesJoinOutcomes(
                range.startDate,
                range.endDate
            );

        return { data: { statuses } };
    }

    async workspacesMembership(
        params: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticWorkspaceCount>> {
        return this.analyticDashboardDomain.workspacesMembership(params);
    }

    async workspacesActivityVolume(
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponsePagingReturn<IAnalyticWorkspaceCount>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );

        return this.analyticDashboardDomain.workspacesActivityVolume(
            range.startDate,
            range.endDate,
            params
        );
    }

    async projectsCreation(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticProjectCreation>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticDashboardDomain.projectsCreation(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async projectsMembership(
        params: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticProjectCount>> {
        return this.analyticDashboardDomain.projectsMembership(params);
    }
}

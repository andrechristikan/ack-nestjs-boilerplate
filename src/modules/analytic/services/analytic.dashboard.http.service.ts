import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import type { AnalyticWorkspacesMembershipListRequestDto } from '@modules/analytic/dtos/request/analytic.workspaces-membership-list.request.dto';
import type { AnalyticWorkspacesActivityVolumeListRequestDto } from '@modules/analytic/dtos/request/analytic.workspaces-activity-volume-list.request.dto';
import type { AnalyticProjectsMembershipListRequestDto } from '@modules/analytic/dtos/request/analytic.projects-membership-list.request.dto';
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
import type { AnalyticOptionalDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticDashboardHttpService {
    constructor(
        private readonly analyticDashboardDomain: AnalyticDashboardDomain,
        private readonly analyticDateDomain: AnalyticDateDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async usersRegistrations({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.usersRegistrations(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersChurn({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricRate>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.usersChurn(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersBlocked({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticBlockedUsers>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.usersBlocked(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersSignUpWith(
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersSignUpWith(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersSignUpFrom(
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersSignUpFrom(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersEmailVerification(
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersEmailVerification(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersMobileVerification(
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data = await this.analyticDashboardDomain.usersMobileVerification(
            range.startDate,
            range.endDate
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

    async usersSelfDelete({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.usersSelfDelete(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersClaimUsername({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.usersClaimUsername(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async usersMobileChurn({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMobileChurn>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.usersMobileChurn(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authLoginFrequency({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.authLoginFrequency(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authLoginMethod(
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authLoginMethod(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authLoginSource(
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authLoginSource(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authLockout({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticLockoutMetrics>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.authLockout(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authSessionRevoke({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
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
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authSessionsGeo(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authSessionsUserAgent(
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data = await this.analyticDashboardDomain.authSessionsUserAgent(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authRefreshTokenVolume({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.authRefreshTokenVolume(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authLogoutRate({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.authLogoutRate(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authVerificationFunnel({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticVerificationFunnels>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
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

    async authPasswordChange({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.authPasswordChange(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authForgotPasswordConversion({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticForgotPasswordConversion>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data =
            await this.analyticDashboardDomain.authForgotPasswordConversion(
                range.startDate,
                range.endDate
            );

        return { data };
    }

    async authAdminForcePassword({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
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

    async authTwoFactorAdminReset({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.authTwoFactorAdminReset(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async authTwoFactorVerifySuccess({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data =
            await this.analyticDashboardDomain.authTwoFactorVerifySuccess(
                range.startDate,
                range.endDate
            );

        return { data };
    }

    async authBackupCodeRegeneration({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
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

    async devicesRegistration({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
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

    async devicesInfoRefresh({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
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

    async apiKeysLifecycle({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticApiKeyLifecycle>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
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
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticTermPolicyAcceptanceRate>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data =
            await this.analyticDashboardDomain.termPoliciesAcceptanceRate(
                range.startDate,
                range.endDate
            );

        return { data };
    }

    async termPoliciesTimeToAccept(
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticTermPolicyTimeToAccept>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data =
            await this.analyticDashboardDomain.termPoliciesTimeToAccept(
                range.startDate,
                range.endDate
            );

        return { data };
    }

    async workspacesCreation({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
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

    async workspacesInviteFunnel({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticStatusCountList>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const statuses =
            await this.analyticDashboardDomain.workspacesInviteFunnel(
                range.startDate,
                range.endDate
            );

        return { data: { statuses } };
    }

    async workspacesJoinOutcomes({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticStatusCountList>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const statuses =
            await this.analyticDashboardDomain.workspacesJoinOutcomes(
                range.startDate,
                range.endDate
            );

        return { data: { statuses } };
    }

    async workspacesMembership(
        query: AnalyticWorkspacesMembershipListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.WorkspaceMemberWhereInput>(
                query,
                { availableOrderBy: [] }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticDashboardDomain.workspacesMembership(params);
    }

    async workspacesActivityVolume(
        query: AnalyticWorkspacesActivityVolumeListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                { availableOrderBy: [] }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);
        const range = this.analyticDateDomain.requireRange(
            query.startDate,
            query.endDate
        );

        return this.analyticDashboardDomain.workspacesActivityVolume(
            range.startDate,
            range.endDate,
            params
        );
    }

    async projectsCreation({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticProjectCreation>
    > {
        const range = this.analyticDateDomain.requireRange(startDate, endDate);
        const data = await this.analyticDashboardDomain.projectsCreation(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async projectsMembership(
        query: AnalyticProjectsMembershipListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ProjectMemberWhereInput>(
                query,
                { availableOrderBy: [] }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticDashboardDomain.projectsMembership(params);
    }
}

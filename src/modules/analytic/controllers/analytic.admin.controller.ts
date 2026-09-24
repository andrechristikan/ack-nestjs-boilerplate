import { AnalyticWorkspacesMembershipListRequestSchema } from '@modules/analytic/dtos/request/analytic-workspaces-membership-list.request.dto';
import type { AnalyticWorkspacesMembershipListRequestDto } from '@modules/analytic/dtos/request/analytic-workspaces-membership-list.request.dto';
import { AnalyticWorkspacesActivityVolumeListRequestSchema } from '@modules/analytic/dtos/request/analytic-workspaces-activity-volume-list.request.dto';
import type { AnalyticWorkspacesActivityVolumeListRequestDto } from '@modules/analytic/dtos/request/analytic-workspaces-activity-volume-list.request.dto';
import { AnalyticProjectsMembershipListRequestSchema } from '@modules/analytic/dtos/request/analytic-projects-membership-list.request.dto';
import type { AnalyticProjectsMembershipListRequestDto } from '@modules/analytic/dtos/request/analytic-projects-membership-list.request.dto';
import { AnalyticCredentialStuffingListRequestSchema } from '@modules/analytic/dtos/request/analytic-credential-stuffing-list.request.dto';
import type { AnalyticCredentialStuffingListRequestDto } from '@modules/analytic/dtos/request/analytic-credential-stuffing-list.request.dto';
import { AnalyticAccountTakeoverListRequestSchema } from '@modules/analytic/dtos/request/analytic-account-takeover-list.request.dto';
import type { AnalyticAccountTakeoverListRequestDto } from '@modules/analytic/dtos/request/analytic-account-takeover-list.request.dto';
import { AnalyticMassRegistrationListRequestSchema } from '@modules/analytic/dtos/request/analytic-mass-registration-list.request.dto';
import type { AnalyticMassRegistrationListRequestDto } from '@modules/analytic/dtos/request/analytic-mass-registration-list.request.dto';
import { AnalyticPasswordResetEnumerationListRequestSchema } from '@modules/analytic/dtos/request/analytic-password-reset-enumeration-list.request.dto';
import type { AnalyticPasswordResetEnumerationListRequestDto } from '@modules/analytic/dtos/request/analytic-password-reset-enumeration-list.request.dto';
import { AnalyticSharedFingerprintListRequestSchema } from '@modules/analytic/dtos/request/analytic-shared-fingerprint-list.request.dto';
import type { AnalyticSharedFingerprintListRequestDto } from '@modules/analytic/dtos/request/analytic-shared-fingerprint-list.request.dto';
import { AnalyticSessionAfterAdminListRequestSchema } from '@modules/analytic/dtos/request/analytic-session-after-admin-list.request.dto';
import type { AnalyticSessionAfterAdminListRequestDto } from '@modules/analytic/dtos/request/analytic-session-after-admin-list.request.dto';
import { AnalyticForgotPasswordAbuseListRequestSchema } from '@modules/analytic/dtos/request/analytic-forgot-password-abuse-list.request.dto';
import type { AnalyticForgotPasswordAbuseListRequestDto } from '@modules/analytic/dtos/request/analytic-forgot-password-abuse-list.request.dto';
import { AnalyticRefreshSpikeListRequestSchema } from '@modules/analytic/dtos/request/analytic-refresh-spike-list.request.dto';
import type { AnalyticRefreshSpikeListRequestDto } from '@modules/analytic/dtos/request/analytic-refresh-spike-list.request.dto';
import { AnalyticBackupCodeNewDeviceListRequestSchema } from '@modules/analytic/dtos/request/analytic-backup-code-new-device-list.request.dto';
import type { AnalyticBackupCodeNewDeviceListRequestDto } from '@modules/analytic/dtos/request/analytic-backup-code-new-device-list.request.dto';
import { AnalyticApiKeyBurstListRequestSchema } from '@modules/analytic/dtos/request/analytic-api-key-burst-list.request.dto';
import type { AnalyticApiKeyBurstListRequestDto } from '@modules/analytic/dtos/request/analytic-api-key-burst-list.request.dto';
import { AnalyticFraudRiskScoresListRequestSchema } from '@modules/analytic/dtos/request/analytic-fraud-risk-scores-list.request.dto';
import type { AnalyticFraudRiskScoresListRequestDto } from '@modules/analytic/dtos/request/analytic-fraud-risk-scores-list.request.dto';
import { AnalyticImpossibleTravelListRequestSchema } from '@modules/analytic/dtos/request/analytic-impossible-travel-list.request.dto';
import type { AnalyticImpossibleTravelListRequestDto } from '@modules/analytic/dtos/request/analytic-impossible-travel-list.request.dto';
import { AnalyticLoginSpikeIpListRequestSchema } from '@modules/analytic/dtos/request/analytic-login-spike-ip-list.request.dto';
import type { AnalyticLoginSpikeIpListRequestDto } from '@modules/analytic/dtos/request/analytic-login-spike-ip-list.request.dto';
import { AnalyticNearLockoutListRequestSchema } from '@modules/analytic/dtos/request/analytic-near-lockout-list.request.dto';
import type { AnalyticNearLockoutListRequestDto } from '@modules/analytic/dtos/request/analytic-near-lockout-list.request.dto';
import { AnalyticDeviceProliferationListRequestSchema } from '@modules/analytic/dtos/request/analytic-device-proliferation-list.request.dto';
import type { AnalyticDeviceProliferationListRequestDto } from '@modules/analytic/dtos/request/analytic-device-proliferation-list.request.dto';
import { AnalyticLoginTimeAnomalyListRequestSchema } from '@modules/analytic/dtos/request/analytic-login-time-anomaly-list.request.dto';
import type { AnalyticLoginTimeAnomalyListRequestDto } from '@modules/analytic/dtos/request/analytic-login-time-anomaly-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import type {
    IAnalyticAccountTakeover,
    IAnalyticAnomalySummary,
    IAnalyticApiKeyActiveExpired,
    IAnalyticApiKeyBurst,
    IAnalyticApiKeyLifecycle,
    IAnalyticBackupCodeNewDevice,
    IAnalyticBlockedUsers,
    IAnalyticBucketsResult,
    IAnalyticCredentialStuffing,
    IAnalyticDeviceProliferation,
    IAnalyticForgotPasswordAbuse,
    IAnalyticForgotPasswordConversion,
    IAnalyticFraudRiskScore,
    IAnalyticFraudSummary,
    IAnalyticImpossibleTravel,
    IAnalyticLockoutMetrics,
    IAnalyticLoginSpikeIp,
    IAnalyticLoginTimeAnomaly,
    IAnalyticMassRegistration,
    IAnalyticMetricCount,
    IAnalyticMetricRate,
    IAnalyticMobileChurn,
    IAnalyticNearLockout,
    IAnalyticPasswordExpiry,
    IAnalyticPasswordResetEnumeration,
    IAnalyticProjectCount,
    IAnalyticProjectCreation,
    IAnalyticRefreshSpike,
    IAnalyticSessionAfterAdmin,
    IAnalyticSessionDeviceRatio,
    IAnalyticSharedFingerprint,
    IAnalyticStatusCountList,
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticTermPolicyTimeToAccept,
    IAnalyticTwoFactorAdoption,
    IAnalyticTwoFactorAttemptSnapshot,
    IAnalyticVerificationFunnels,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';

import { RequestThrottle } from '@common/request/decorators/request.decorator';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';

import { AnalyticApiKeyActiveExpiredResponseSchema } from '@modules/analytic/dtos/response/analytic.api-key-active-expired.response.dto';
import { AnalyticApiKeyLifecycleResponseSchema } from '@modules/analytic/dtos/response/analytic.api-key-lifecycle.response.dto';
import { AnalyticBlockedUsersResponseSchema } from '@modules/analytic/dtos/response/analytic.blocked-users.response.dto';
import { AnalyticBucketsResponseSchema } from '@modules/analytic/dtos/response/analytic.buckets.response.dto';
import { AnalyticForgotPasswordConversionResponseSchema } from '@modules/analytic/dtos/response/analytic.forgot-password-conversion.response.dto';
import { AnalyticLockoutResponseSchema } from '@modules/analytic/dtos/response/analytic.lockout.response.dto';
import { AnalyticMetricCountResponseSchema } from '@modules/analytic/dtos/response/analytic.metric-count.response.dto';
import { AnalyticMetricRateResponseSchema } from '@modules/analytic/dtos/response/analytic.metric-rate.response.dto';
import { AnalyticMobileChurnResponseSchema } from '@modules/analytic/dtos/response/analytic.mobile-churn.response.dto';
import { AnalyticPasswordExpiryResponseSchema } from '@modules/analytic/dtos/response/analytic.password-expiry.response.dto';
import { AnalyticProjectCountResponseSchema } from '@modules/analytic/dtos/response/analytic.project-count.response.dto';
import { AnalyticProjectCreationResponseSchema } from '@modules/analytic/dtos/response/analytic.project-creation.response.dto';
import { AnalyticSessionDeviceRatioResponseSchema } from '@modules/analytic/dtos/response/analytic.session-device-ratio.response.dto';
import { AnalyticStatusCountResponseSchema } from '@modules/analytic/dtos/response/analytic.status-count.response.dto';
import { AnalyticTermPolicyAcceptanceRateResponseSchema } from '@modules/analytic/dtos/response/analytic.term-policy-acceptance-rate.response.dto';
import { AnalyticTermPolicyTimeToAcceptResponseSchema } from '@modules/analytic/dtos/response/analytic.term-policy-time-to-accept.response.dto';
import { AnalyticTwoFactorAdoptionResponseSchema } from '@modules/analytic/dtos/response/analytic.two-factor-adoption.response.dto';
import { AnalyticTwoFactorAttemptResponseSchema } from '@modules/analytic/dtos/response/analytic.two-factor-attempt.response.dto';
import { AnalyticVerificationFunnelResponseSchema } from '@modules/analytic/dtos/response/analytic.verification-funnel.response.dto';
import { AnalyticWorkspaceCountResponseSchema } from '@modules/analytic/dtos/response/analytic.workspace-count.response.dto';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';

import { AnalyticDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { AnalyticOptionalDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import type { AnalyticOptionalDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import { AnalyticDashboardHttpService } from '@modules/analytic/services/analytic.dashboard.http.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';

import { AnalyticFraudSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-summary.response.dto';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';
import type { AnalyticWindowRequestDto } from '@modules/analytic/dtos/request/analytic.window.request.dto';
import { AnalyticFraudRiskScoreResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-risk-score.response.dto';
import { AnalyticAccountTakeoverResponseSchema } from '@modules/analytic/dtos/response/analytic.account-takeover.response.dto';
import { AnalyticBackupCodeNewDeviceResponseSchema } from '@modules/analytic/dtos/response/analytic.backup-code-new-device.response.dto';
import { AnalyticCredentialStuffingResponseSchema } from '@modules/analytic/dtos/response/analytic.credential-stuffing.response.dto';
import { AnalyticForgotPasswordAbuseResponseSchema } from '@modules/analytic/dtos/response/analytic.forgot-password-abuse.response.dto';
import { AnalyticKeyCountResponseSchema } from '@modules/analytic/dtos/response/analytic.key-count.response.dto';
import { AnalyticSessionAfterAdminResponseSchema } from '@modules/analytic/dtos/response/analytic.session-after-admin.response.dto';
import { AnalyticSharedFingerprintResponseSchema } from '@modules/analytic/dtos/response/analytic.shared-fingerprint.response.dto';
import { AnalyticUserCountResponseSchema } from '@modules/analytic/dtos/response/analytic.user-count.response.dto';
import { AnalyticFraudHttpService } from '@modules/analytic/services/analytic.fraud.http.service';
import { AnalyticAnomalySummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';
import { AnalyticDeviceProliferationResponseSchema } from '@modules/analytic/dtos/response/analytic.device-proliferation.response.dto';
import { AnalyticImpossibleTravelResponseSchema } from '@modules/analytic/dtos/response/analytic.impossible-travel.response.dto';
import { AnalyticLoginSpikeIpResponseSchema } from '@modules/analytic/dtos/response/analytic.login-spike-ip.response.dto';
import { AnalyticLoginTimeAnomalyResponseSchema } from '@modules/analytic/dtos/response/analytic.login-time-anomaly.response.dto';
import { AnalyticNearLockoutResponseSchema } from '@modules/analytic/dtos/response/analytic.near-lockout.response.dto';
import { AnalyticAnomalyHttpService } from '@modules/analytic/services/analytic.anomaly.http.service';

@ApiTags('modules.admin.analytic')
@Controller({
    version: '1',
    path: '/analytic',
})
export class AnalyticAdminController {
    constructor(
        private readonly analyticDashboardHttpService: AnalyticDashboardHttpService,
        private readonly analyticFraudHttpService: AnalyticFraudHttpService,
        private readonly analyticAnomalyHttpService: AnalyticAnomalyHttpService
    ) {}

    @Doc({ summary: 'admin get user registration count by date range' })
    @Response('analytic.usersRegistrations', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/registrations')
    async usersRegistrations(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.usersRegistrations(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get user churn rate by date range' })
    @Response('analytic.usersChurn', {
        schema: AnalyticMetricRateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/churn')
    async usersChurn(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        return this.analyticDashboardHttpService.usersChurn(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get blocked user counts by date range' })
    @Response('analytic.usersBlocked', {
        schema: AnalyticBlockedUsersResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/blocked')
    async usersBlocked(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBlockedUsers>> {
        return this.analyticDashboardHttpService.usersBlocked(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get user sign up method distribution' })
    @Response('analytic.usersSignUpWith', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/sign-up-with')
    async usersSignUpWith(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticDashboardHttpService.usersSignUpWith(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get user sign up source distribution' })
    @Response('analytic.usersSignUpFrom', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/sign-up-from')
    async usersSignUpFrom(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticDashboardHttpService.usersSignUpFrom(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get user email verification rate' })
    @Response('analytic.usersEmailVerification', {
        schema: AnalyticMetricRateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/email-verification')
    async usersEmailVerification(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        return this.analyticDashboardHttpService.usersEmailVerification(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get user mobile verification rate' })
    @Response('analytic.usersMobileVerification', {
        schema: AnalyticMetricRateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/mobile-verification')
    async usersMobileVerification(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        return this.analyticDashboardHttpService.usersMobileVerification(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get user status distribution' })
    @Response('analytic.usersStatusDistribution', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/status-distribution')
    async usersStatusDistribution(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        return this.analyticDashboardHttpService.usersStatusDistribution();
    }

    @Doc({ summary: 'admin get user country distribution' })
    @Response('analytic.usersCountryDistribution', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/country-distribution')
    async usersCountryDistribution(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        return this.analyticDashboardHttpService.usersCountryDistribution();
    }

    @Doc({ summary: 'admin get user role distribution' })
    @Response('analytic.usersRoleDistribution', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/role-distribution')
    async usersRoleDistribution(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        return this.analyticDashboardHttpService.usersRoleDistribution();
    }

    @Doc({ summary: 'admin get user self delete count by date range' })
    @Response('analytic.usersSelfDelete', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/self-delete')
    async usersSelfDelete(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.usersSelfDelete(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get username claim count by date range' })
    @Response('analytic.usersClaimUsername', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/claim-username')
    async usersClaimUsername(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.usersClaimUsername(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get user mobile number churn by date range' })
    @Response('analytic.usersMobileChurn', {
        schema: AnalyticMobileChurnResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/users/mobile-churn')
    async usersMobileChurn(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMobileChurn>> {
        return this.analyticDashboardHttpService.usersMobileChurn(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get login frequency by date range' })
    @Response('analytic.authLoginFrequency', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/login-frequency')
    async authLoginFrequency(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.authLoginFrequency(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get login method distribution' })
    @Response('analytic.authLoginMethod', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/login-method')
    async authLoginMethod(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticDashboardHttpService.authLoginMethod(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get login source distribution' })
    @Response('analytic.authLoginSource', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/login-source')
    async authLoginSource(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticDashboardHttpService.authLoginSource(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get account lockout metrics by date range' })
    @Response('analytic.authLockout', {
        schema: AnalyticLockoutResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/lockout')
    async authLockout(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticLockoutMetrics>> {
        return this.analyticDashboardHttpService.authLockout(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get session revoke count by date range' })
    @Response('analytic.authSessionRevoke', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/session-revoke')
    async authSessionRevoke(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.authSessionRevoke(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get concurrent session distribution' })
    @Response('analytic.authConcurrentSessions', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/concurrent-sessions')
    async authConcurrentSessions(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        return this.analyticDashboardHttpService.authConcurrentSessions();
    }

    @Doc({ summary: 'admin get session country distribution' })
    @Response('analytic.authSessionsGeo', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/sessions-geo')
    async authSessionsGeo(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticDashboardHttpService.authSessionsGeo(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get session user agent distribution' })
    @Response('analytic.authSessionsUserAgent', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/sessions-user-agent')
    async authSessionsUserAgent(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticDashboardHttpService.authSessionsUserAgent(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get refresh token volume by date range' })
    @Response('analytic.authRefreshTokenVolume', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/refresh-token-volume')
    async authRefreshTokenVolume(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.authRefreshTokenVolume(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get logout count by date range' })
    @Response('analytic.authLogoutRate', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/logout-rate')
    async authLogoutRate(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.authLogoutRate(
            query.startDate,
            query.endDate
        );
    }

    @Doc({
        summary:
            'admin get email and mobile verification funnels by date range',
    })
    @Response('analytic.authVerificationFunnel', {
        schema: AnalyticVerificationFunnelResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/verification-funnel')
    async authVerificationFunnel(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticVerificationFunnels>> {
        return this.analyticDashboardHttpService.authVerificationFunnel(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get password expiry snapshot' })
    @Response('analytic.authPasswordExpiry', {
        schema: AnalyticPasswordExpiryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/password-expiry')
    async authPasswordExpiry(): Promise<
        IResponseReturn<IAnalyticPasswordExpiry>
    > {
        return this.analyticDashboardHttpService.authPasswordExpiry();
    }

    @Doc({ summary: 'admin get password change count by date range' })
    @Response('analytic.authPasswordChange', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/password-change')
    async authPasswordChange(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.authPasswordChange(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get forgot password conversion by date range' })
    @Response('analytic.authForgotPasswordConversion', {
        schema: AnalyticForgotPasswordConversionResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/forgot-password-conversion')
    async authForgotPasswordConversion(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticForgotPasswordConversion>> {
        return this.analyticDashboardHttpService.authForgotPasswordConversion(
            query.startDate,
            query.endDate
        );
    }

    @Doc({
        summary: 'admin get admin forced password change count by date range',
    })
    @Response('analytic.authAdminForcePassword', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/admin-force-password')
    async authAdminForcePassword(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.authAdminForcePassword(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get two factor adoption snapshot' })
    @Response('analytic.authTwoFactorAdoption', {
        schema: AnalyticTwoFactorAdoptionResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/two-factor-adoption')
    async authTwoFactorAdoption(): Promise<
        IResponseReturn<IAnalyticTwoFactorAdoption>
    > {
        return this.analyticDashboardHttpService.authTwoFactorAdoption();
    }

    @Doc({ summary: 'admin get admin two factor reset count by date range' })
    @Response('analytic.authTwoFactorAdminReset', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/two-factor-admin-reset')
    async authTwoFactorAdminReset(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.authTwoFactorAdminReset(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get two factor verify success count by date range' })
    @Response('analytic.authTwoFactorVerifySuccess', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/two-factor-verify-success')
    async authTwoFactorVerifySuccess(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.authTwoFactorVerifySuccess(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get backup code regeneration count by date range' })
    @Response('analytic.authBackupCodeRegeneration', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/backup-code-regeneration')
    async authBackupCodeRegeneration(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.authBackupCodeRegeneration(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get two factor attempt snapshot' })
    @Response('analytic.authTwoFactorAttempt', {
        schema: AnalyticTwoFactorAttemptResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/auth/two-factor-attempt')
    async authTwoFactorAttempt(): Promise<
        IResponseReturn<IAnalyticTwoFactorAttemptSnapshot>
    > {
        return this.analyticDashboardHttpService.authTwoFactorAttempt();
    }

    @Doc({ summary: 'admin get device registration count by date range' })
    @Response('analytic.devicesRegistration', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/devices/registration')
    async devicesRegistration(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.devicesRegistration(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get device platform distribution' })
    @Response('analytic.devicesPlatform', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/devices/platform')
    async devicesPlatform(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticDashboardHttpService.devicesPlatform();
    }

    @Doc({ summary: 'admin get device push token coverage rate' })
    @Response('analytic.devicesPushToken', {
        schema: AnalyticMetricRateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/devices/push-token')
    async devicesPushToken(): Promise<IResponseReturn<IAnalyticMetricRate>> {
        return this.analyticDashboardHttpService.devicesPushToken();
    }

    @Doc({ summary: 'admin get device info refresh count by date range' })
    @Response('analytic.devicesInfoRefresh', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/devices/info-refresh')
    async devicesInfoRefresh(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.devicesInfoRefresh(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get session to device ratio' })
    @Response('analytic.devicesSessionRatio', {
        schema: AnalyticSessionDeviceRatioResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/devices/session-ratio')
    async devicesSessionRatio(): Promise<
        IResponseReturn<IAnalyticSessionDeviceRatio>
    > {
        return this.analyticDashboardHttpService.devicesSessionRatio();
    }

    @Doc({ summary: 'admin get device per user distribution' })
    @Response('analytic.devicesPerUser', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/devices/per-user')
    async devicesPerUser(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticDashboardHttpService.devicesPerUser();
    }

    @Doc({ summary: 'admin get inactive device count' })
    @Response('analytic.devicesInactivity', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/devices/inactivity')
    async devicesInactivity(): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.devicesInactivity();
    }

    @Doc({ summary: 'admin get api key lifecycle counts by date range' })
    @Response('analytic.apiKeysLifecycle', {
        schema: AnalyticApiKeyLifecycleResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/api-keys/lifecycle')
    async apiKeysLifecycle(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticApiKeyLifecycle>> {
        return this.analyticDashboardHttpService.apiKeysLifecycle(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get active and expired api key counts' })
    @Response('analytic.apiKeysActiveExpired', {
        schema: AnalyticApiKeyActiveExpiredResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/api-keys/active-expired')
    async apiKeysActiveExpired(): Promise<
        IResponseReturn<IAnalyticApiKeyActiveExpired>
    > {
        return this.analyticDashboardHttpService.apiKeysActiveExpired();
    }

    @Doc({ summary: 'admin get api key type distribution' })
    @Response('analytic.apiKeysTypeMix', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/api-keys/type-mix')
    async apiKeysTypeMix(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticDashboardHttpService.apiKeysTypeMix();
    }

    @Doc({ summary: 'admin get term policy acceptance rate' })
    @Response('analytic.termPoliciesAcceptanceRate', {
        schema: AnalyticTermPolicyAcceptanceRateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/term-policies/acceptance-rate')
    async termPoliciesAcceptanceRate(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticTermPolicyAcceptanceRate>> {
        return this.analyticDashboardHttpService.termPoliciesAcceptanceRate(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get term policy time to accept' })
    @Response('analytic.termPoliciesTimeToAccept', {
        schema: AnalyticTermPolicyTimeToAcceptResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/term-policies/time-to-accept')
    async termPoliciesTimeToAccept(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticTermPolicyTimeToAccept>> {
        return this.analyticDashboardHttpService.termPoliciesTimeToAccept(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get workspace creation count by date range' })
    @Response('analytic.workspacesCreation', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/workspaces/creation')
    async workspacesCreation(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDashboardHttpService.workspacesCreation(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get workspace visibility distribution' })
    @Response('analytic.workspacesVisibility', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/workspaces/visibility')
    async workspacesVisibility(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        return this.analyticDashboardHttpService.workspacesVisibility();
    }

    @Doc({ summary: 'admin get workspace invite funnel by date range' })
    @Response('analytic.workspacesInviteFunnel', {
        schema: AnalyticStatusCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/workspaces/invite-funnel')
    async workspacesInviteFunnel(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        return this.analyticDashboardHttpService.workspacesInviteFunnel(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get workspace join request outcomes by date range' })
    @Response('analytic.workspacesJoinOutcomes', {
        schema: AnalyticStatusCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/workspaces/join-outcomes')
    async workspacesJoinOutcomes(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        return this.analyticDashboardHttpService.workspacesJoinOutcomes(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get member counts per workspace' })
    @ResponsePagination('analytic.workspacesMembership', {
        schema: AnalyticWorkspaceCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/workspaces/membership')
    async workspacesMembership(
        @Query({ schema: AnalyticWorkspacesMembershipListRequestSchema })
        query: AnalyticWorkspacesMembershipListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return this.analyticDashboardHttpService.workspacesMembership(query);
    }

    @Doc({ summary: 'admin get activity volume per workspace by date range' })
    @ResponsePagination('analytic.workspacesActivityVolume', {
        schema: AnalyticWorkspaceCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/workspaces/activity-volume')
    async workspacesActivityVolume(
        @Query({ schema: AnalyticWorkspacesActivityVolumeListRequestSchema })
        query: AnalyticWorkspacesActivityVolumeListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return this.analyticDashboardHttpService.workspacesActivityVolume(
            query
        );
    }

    @Doc({ summary: 'admin get project creation counts by date range' })
    @Response('analytic.projectsCreation', {
        schema: AnalyticProjectCreationResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/projects/creation')
    async projectsCreation(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticProjectCreation>> {
        return this.analyticDashboardHttpService.projectsCreation(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get member counts per project' })
    @ResponsePagination('analytic.projectsMembership', {
        schema: AnalyticProjectCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/projects/membership')
    async projectsMembership(
        @Query({ schema: AnalyticProjectsMembershipListRequestSchema })
        query: AnalyticProjectsMembershipListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        return this.analyticDashboardHttpService.projectsMembership(query);
    }

    @Doc({ summary: 'admin get credential stuffing fraud summary' })
    @Response('analytic.fraudCredentialStuffing', {
        schema: AnalyticFraudSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/credential-stuffing')
    async credentialStuffing(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticFraudHttpService.credentialStuffingSummary(
            query.windowMs
        );
    }

    @Doc({ summary: 'admin get all credential stuffing fraud detections' })
    @ResponsePagination('analytic.fraudCredentialStuffingList', {
        schema: AnalyticCredentialStuffingResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/credential-stuffing/list')
    async credentialStuffingList(
        @Query({ schema: AnalyticCredentialStuffingListRequestSchema })
        query: AnalyticCredentialStuffingListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticCredentialStuffing>> {
        return this.analyticFraudHttpService.credentialStuffingList(query);
    }

    @Doc({ summary: 'admin get account takeover fraud summary' })
    @Response('analytic.fraudAccountTakeover', {
        schema: AnalyticFraudSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/account-takeover')
    async accountTakeover(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticFraudHttpService.accountTakeoverSummary(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get all account takeover fraud detections' })
    @ResponsePagination('analytic.fraudAccountTakeoverList', {
        schema: AnalyticAccountTakeoverResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/account-takeover/list')
    async accountTakeoverList(
        @Query({ schema: AnalyticAccountTakeoverListRequestSchema })
        query: AnalyticAccountTakeoverListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticAccountTakeover>> {
        return this.analyticFraudHttpService.accountTakeoverList(query);
    }

    @Doc({ summary: 'admin get mass registration fraud summary' })
    @Response('analytic.fraudMassRegistration', {
        schema: AnalyticFraudSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/mass-registration')
    async massRegistration(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticFraudHttpService.massRegistrationSummary(
            query.windowMs
        );
    }

    @Doc({ summary: 'admin get all mass registration fraud detections' })
    @ResponsePagination('analytic.fraudMassRegistrationList', {
        schema: AnalyticKeyCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/mass-registration/list')
    async massRegistrationList(
        @Query({ schema: AnalyticMassRegistrationListRequestSchema })
        query: AnalyticMassRegistrationListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticMassRegistration>> {
        return this.analyticFraudHttpService.massRegistrationList(query);
    }

    @Doc({ summary: 'admin get password reset enumeration fraud summary' })
    @Response('analytic.fraudPasswordResetEnumeration', {
        schema: AnalyticFraudSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/password-reset-enumeration')
    async passwordResetEnumeration(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticFraudHttpService.passwordResetEnumerationSummary(
            query.windowMs
        );
    }

    @Doc({
        summary: 'admin get all password reset enumeration fraud detections',
    })
    @ResponsePagination('analytic.fraudPasswordResetEnumerationList', {
        schema: AnalyticKeyCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/password-reset-enumeration/list')
    async passwordResetEnumerationList(
        @Query({ schema: AnalyticPasswordResetEnumerationListRequestSchema })
        query: AnalyticPasswordResetEnumerationListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticPasswordResetEnumeration>> {
        return this.analyticFraudHttpService.passwordResetEnumerationList(
            query
        );
    }

    @Doc({ summary: 'admin get shared device fingerprint fraud summary' })
    @Response('analytic.fraudSharedFingerprint', {
        schema: AnalyticFraudSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/shared-fingerprint')
    async sharedFingerprint(): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticFraudHttpService.sharedFingerprintSummary();
    }

    @Doc({
        summary: 'admin get all shared device fingerprint fraud detections',
    })
    @ResponsePagination('analytic.fraudSharedFingerprintList', {
        schema: AnalyticSharedFingerprintResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/shared-fingerprint/list')
    async sharedFingerprintList(
        @Query({ schema: AnalyticSharedFingerprintListRequestSchema })
        query: AnalyticSharedFingerprintListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticSharedFingerprint>> {
        return this.analyticFraudHttpService.sharedFingerprintList(query);
    }

    @Doc({ summary: 'admin get session after admin action fraud summary' })
    @Response('analytic.fraudSessionAfterAdmin', {
        schema: AnalyticFraudSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/session-after-admin')
    async sessionAfterAdmin(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticFraudHttpService.sessionAfterAdminSummary(
            query.startDate,
            query.endDate
        );
    }

    @Doc({
        summary: 'admin get all session after admin action fraud detections',
    })
    @ResponsePagination('analytic.fraudSessionAfterAdminList', {
        schema: AnalyticSessionAfterAdminResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/session-after-admin/list')
    async sessionAfterAdminList(
        @Query({ schema: AnalyticSessionAfterAdminListRequestSchema })
        query: AnalyticSessionAfterAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticSessionAfterAdmin>> {
        return this.analyticFraudHttpService.sessionAfterAdminList(query);
    }

    @Doc({ summary: 'admin get forgot password token abuse fraud summary' })
    @Response('analytic.fraudForgotPasswordTokenAbuse', {
        schema: AnalyticFraudSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/forgot-password-token-abuse')
    async forgotPasswordTokenAbuse(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticFraudHttpService.forgotPasswordTokenAbuseSummary(
            query.windowMs
        );
    }

    @Doc({
        summary: 'admin get all forgot password token abuse fraud detections',
    })
    @ResponsePagination('analytic.fraudForgotPasswordTokenAbuseList', {
        schema: AnalyticForgotPasswordAbuseResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/forgot-password-token-abuse/list')
    async forgotPasswordTokenAbuseList(
        @Query({ schema: AnalyticForgotPasswordAbuseListRequestSchema })
        query: AnalyticForgotPasswordAbuseListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticForgotPasswordAbuse>> {
        return this.analyticFraudHttpService.forgotPasswordTokenAbuseList(
            query
        );
    }

    @Doc({ summary: 'admin get refresh token spike fraud summary' })
    @Response('analytic.fraudRefreshSpike', {
        schema: AnalyticFraudSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/refresh-spike')
    async refreshSpike(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticFraudHttpService.refreshSpikeSummary(
            query.windowMs
        );
    }

    @Doc({ summary: 'admin get all refresh token spike fraud detections' })
    @ResponsePagination('analytic.fraudRefreshSpikeList', {
        schema: AnalyticUserCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/refresh-spike/list')
    async refreshSpikeList(
        @Query({ schema: AnalyticRefreshSpikeListRequestSchema })
        query: AnalyticRefreshSpikeListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticRefreshSpike>> {
        return this.analyticFraudHttpService.refreshSpikeList(query);
    }

    @Doc({ summary: 'admin get backup code on new device fraud summary' })
    @Response('analytic.fraudBackupCodeNewDevice', {
        schema: AnalyticFraudSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/backup-code-new-device')
    async backupCodeNewDevice(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticFraudHttpService.backupCodeNewDeviceSummary(
            query.windowMs
        );
    }

    @Doc({
        summary: 'admin get all backup code on new device fraud detections',
    })
    @ResponsePagination('analytic.fraudBackupCodeNewDeviceList', {
        schema: AnalyticBackupCodeNewDeviceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/backup-code-new-device/list')
    async backupCodeNewDeviceList(
        @Query({ schema: AnalyticBackupCodeNewDeviceListRequestSchema })
        query: AnalyticBackupCodeNewDeviceListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticBackupCodeNewDevice>> {
        return this.analyticFraudHttpService.backupCodeNewDeviceList(query);
    }

    @Doc({ summary: 'admin get api key burst fraud summary' })
    @Response('analytic.fraudApiKeyBurst', {
        schema: AnalyticFraudSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/api-key-burst')
    async apiKeyBurst(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticFraudHttpService.apiKeyBurstSummary(query.windowMs);
    }

    @Doc({ summary: 'admin get all api key burst fraud detections' })
    @ResponsePagination('analytic.fraudApiKeyBurstList', {
        schema: AnalyticUserCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/api-key-burst/list')
    async apiKeyBurstList(
        @Query({ schema: AnalyticApiKeyBurstListRequestSchema })
        query: AnalyticApiKeyBurstListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticApiKeyBurst>> {
        return this.analyticFraudHttpService.apiKeyBurstList(query);
    }

    @Doc({ summary: 'admin get fraud risk score of a user (report-only)' })
    @Response('analytic.fraudRiskScore', {
        schema: AnalyticFraudRiskScoreResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/risk-score/:userId')
    async riskScore(
        @Param('userId', { schema: RequestUuidSchema })
        userId: string
    ): Promise<IResponseReturn<IAnalyticFraudRiskScore>> {
        return this.analyticFraudHttpService.riskScore(userId);
    }

    @Doc({ summary: 'admin get all user fraud risk scores' })
    @ResponsePagination('analytic.fraudRiskScores', {
        schema: AnalyticFraudRiskScoreResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/fraud/risk-scores')
    async riskScores(
        @Query({ schema: AnalyticFraudRiskScoresListRequestSchema })
        query: AnalyticFraudRiskScoresListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticFraudRiskScore>> {
        return this.analyticFraudHttpService.riskScores(query);
    }

    @Doc({ summary: 'admin get impossible travel anomaly summary' })
    @Response('analytic.anomalyImpossibleTravel', {
        schema: AnalyticAnomalySummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/anomaly/impossible-travel')
    async impossibleTravel(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticAnomalySummary>> {
        return this.analyticAnomalyHttpService.impossibleTravelSummary(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get all impossible travel anomaly detections' })
    @ResponsePagination('analytic.anomalyImpossibleTravelList', {
        schema: AnalyticImpossibleTravelResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/anomaly/impossible-travel/list')
    async impossibleTravelList(
        @Query({ schema: AnalyticImpossibleTravelListRequestSchema })
        query: AnalyticImpossibleTravelListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticImpossibleTravel>> {
        return this.analyticAnomalyHttpService.impossibleTravelList(query);
    }

    @Doc({ summary: 'admin get login spike by ip anomaly summary' })
    @Response('analytic.anomalyLoginSpikeIp', {
        schema: AnalyticAnomalySummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/anomaly/login-spike-ip')
    async loginSpikeIp(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticAnomalySummary>> {
        return this.analyticAnomalyHttpService.loginSpikeIpSummary(
            query.windowMs
        );
    }

    @Doc({ summary: 'admin get all login spike by ip anomaly detections' })
    @ResponsePagination('analytic.anomalyLoginSpikeIpList', {
        schema: AnalyticLoginSpikeIpResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/anomaly/login-spike-ip/list')
    async loginSpikeIpList(
        @Query({ schema: AnalyticLoginSpikeIpListRequestSchema })
        query: AnalyticLoginSpikeIpListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticLoginSpikeIp>> {
        return this.analyticAnomalyHttpService.loginSpikeIpList(query);
    }

    @Doc({ summary: 'admin get failed login spike anomaly summary' })
    @Response('analytic.anomalyFailedLoginSpike', {
        schema: AnalyticAnomalySummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/anomaly/failed-login-spike')
    async failedLoginSpike(): Promise<
        IResponseReturn<IAnalyticAnomalySummary>
    > {
        return this.analyticAnomalyHttpService.failedLoginSpikeSummary();
    }

    @Doc({ summary: 'admin get all failed login spike anomaly detections' })
    @ResponsePagination('analytic.anomalyFailedLoginSpikeList', {
        schema: AnalyticNearLockoutResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/anomaly/failed-login-spike/list')
    async failedLoginSpikeList(
        @Query({ schema: AnalyticNearLockoutListRequestSchema })
        query: AnalyticNearLockoutListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>> {
        return this.analyticAnomalyHttpService.failedLoginSpikeList(query);
    }

    @Doc({ summary: 'admin get device proliferation anomaly summary' })
    @Response('analytic.anomalyDeviceProliferation', {
        schema: AnalyticAnomalySummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/anomaly/device-proliferation')
    async deviceProliferation(): Promise<
        IResponseReturn<IAnalyticAnomalySummary>
    > {
        return this.analyticAnomalyHttpService.deviceProliferationSummary();
    }

    @Doc({ summary: 'admin get all device proliferation anomaly detections' })
    @ResponsePagination('analytic.anomalyDeviceProliferationList', {
        schema: AnalyticDeviceProliferationResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/anomaly/device-proliferation/list')
    async deviceProliferationList(
        @Query({ schema: AnalyticDeviceProliferationListRequestSchema })
        query: AnalyticDeviceProliferationListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticDeviceProliferation>> {
        return this.analyticAnomalyHttpService.deviceProliferationList(query);
    }

    @Doc({ summary: 'admin get login time anomaly summary' })
    @Response('analytic.anomalyLoginTime', {
        schema: AnalyticAnomalySummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/anomaly/login-time')
    async loginTime(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticAnomalySummary>> {
        return this.analyticAnomalyHttpService.loginTimeSummary(
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'admin get all login time anomaly detections' })
    @ResponsePagination('analytic.anomalyLoginTimeList', {
        schema: AnalyticLoginTimeAnomalyResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/anomaly/login-time/list')
    async loginTimeList(
        @Query({ schema: AnalyticLoginTimeAnomalyListRequestSchema })
        query: AnalyticLoginTimeAnomalyListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticLoginTimeAnomaly>> {
        return this.analyticAnomalyHttpService.loginTimeList(query);
    }
}

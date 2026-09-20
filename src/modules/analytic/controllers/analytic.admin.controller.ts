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
import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import type {
    IResponsePagingReturn,
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
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    AnalyticAdminAnomalyDeviceProliferationDoc,
    AnalyticAdminAnomalyDeviceProliferationListDoc,
    AnalyticAdminAnomalyFailedLoginSpikeDoc,
    AnalyticAdminAnomalyFailedLoginSpikeListDoc,
    AnalyticAdminAnomalyImpossibleTravelDoc,
    AnalyticAdminAnomalyImpossibleTravelListDoc,
    AnalyticAdminAnomalyLoginSpikeIpDoc,
    AnalyticAdminAnomalyLoginSpikeIpListDoc,
    AnalyticAdminAnomalyLoginTimeDoc,
    AnalyticAdminAnomalyLoginTimeListDoc,
    AnalyticAdminApiKeysActiveExpiredDoc,
    AnalyticAdminApiKeysLifecycleDoc,
    AnalyticAdminApiKeysTypeMixDoc,
    AnalyticAdminAuthAdminForcePasswordDoc,
    AnalyticAdminAuthBackupCodeRegenerationDoc,
    AnalyticAdminAuthConcurrentSessionsDoc,
    AnalyticAdminAuthForgotPasswordConversionDoc,
    AnalyticAdminAuthLockoutDoc,
    AnalyticAdminAuthLoginFrequencyDoc,
    AnalyticAdminAuthLoginMethodDoc,
    AnalyticAdminAuthLoginSourceDoc,
    AnalyticAdminAuthLogoutRateDoc,
    AnalyticAdminAuthPasswordChangeDoc,
    AnalyticAdminAuthPasswordExpiryDoc,
    AnalyticAdminAuthRefreshTokenVolumeDoc,
    AnalyticAdminAuthSessionRevokeDoc,
    AnalyticAdminAuthSessionsGeoDoc,
    AnalyticAdminAuthSessionsUserAgentDoc,
    AnalyticAdminAuthTwoFactorAdminResetDoc,
    AnalyticAdminAuthTwoFactorAdoptionDoc,
    AnalyticAdminAuthTwoFactorAttemptDoc,
    AnalyticAdminAuthTwoFactorVerifySuccessDoc,
    AnalyticAdminAuthVerificationFunnelDoc,
    AnalyticAdminDevicesInactivityDoc,
    AnalyticAdminDevicesInfoRefreshDoc,
    AnalyticAdminDevicesPerUserDoc,
    AnalyticAdminDevicesPlatformDoc,
    AnalyticAdminDevicesPushTokenDoc,
    AnalyticAdminDevicesRegistrationDoc,
    AnalyticAdminDevicesSessionRatioDoc,
    AnalyticAdminFraudAccountTakeoverDoc,
    AnalyticAdminFraudAccountTakeoverListDoc,
    AnalyticAdminFraudApiKeyBurstDoc,
    AnalyticAdminFraudApiKeyBurstListDoc,
    AnalyticAdminFraudBackupCodeNewDeviceDoc,
    AnalyticAdminFraudBackupCodeNewDeviceListDoc,
    AnalyticAdminFraudCredentialStuffingDoc,
    AnalyticAdminFraudCredentialStuffingListDoc,
    AnalyticAdminFraudForgotPasswordTokenAbuseDoc,
    AnalyticAdminFraudForgotPasswordTokenAbuseListDoc,
    AnalyticAdminFraudMassRegistrationDoc,
    AnalyticAdminFraudMassRegistrationListDoc,
    AnalyticAdminFraudPasswordResetEnumerationDoc,
    AnalyticAdminFraudPasswordResetEnumerationListDoc,
    AnalyticAdminFraudRefreshSpikeDoc,
    AnalyticAdminFraudRefreshSpikeListDoc,
    AnalyticAdminFraudRiskScoreDoc,
    AnalyticAdminFraudRiskScoresDoc,
    AnalyticAdminFraudSessionAfterAdminDoc,
    AnalyticAdminFraudSessionAfterAdminListDoc,
    AnalyticAdminFraudSharedFingerprintDoc,
    AnalyticAdminFraudSharedFingerprintListDoc,
    AnalyticAdminProjectsCreationDoc,
    AnalyticAdminProjectsMembershipDoc,
    AnalyticAdminTermPoliciesAcceptanceRateDoc,
    AnalyticAdminTermPoliciesTimeToAcceptDoc,
    AnalyticAdminUsersBlockedDoc,
    AnalyticAdminUsersChurnDoc,
    AnalyticAdminUsersClaimUsernameDoc,
    AnalyticAdminUsersCountryDistributionDoc,
    AnalyticAdminUsersEmailVerificationDoc,
    AnalyticAdminUsersMobileChurnDoc,
    AnalyticAdminUsersMobileVerificationDoc,
    AnalyticAdminUsersRegistrationsDoc,
    AnalyticAdminUsersRoleDistributionDoc,
    AnalyticAdminUsersSelfDeleteDoc,
    AnalyticAdminUsersSignUpFromDoc,
    AnalyticAdminUsersSignUpWithDoc,
    AnalyticAdminUsersStatusDistributionDoc,
    AnalyticAdminWorkspacesActivityVolumeDoc,
    AnalyticAdminWorkspacesCreationDoc,
    AnalyticAdminWorkspacesInviteFunnelDoc,
    AnalyticAdminWorkspacesJoinOutcomesDoc,
    AnalyticAdminWorkspacesMembershipDoc,
    AnalyticAdminWorkspacesVisibilityDoc,
} from '@modules/analytic/docs/analytic.admin.doc';
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
    Prisma,
} from '@generated/prisma-client/client';
import { AnalyticFraudSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-summary.response.dto';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    AnalyticAccountTakeoverAvailableOrderBy,
    AnalyticBackupCodeNewDeviceAvailableOrderBy,
    AnalyticCredentialStuffingAvailableOrderBy,
    AnalyticDeviceProliferationAvailableOrderBy,
    AnalyticForgotPasswordAbuseAvailableOrderBy,
    AnalyticFraudRiskScoreAvailableOrderBy,
    AnalyticImpossibleTravelAvailableOrderBy,
    AnalyticKeyCountAvailableOrderBy,
    AnalyticLoginSpikeIpAvailableOrderBy,
    AnalyticLoginTimeAnomalyAvailableOrderBy,
    AnalyticNearLockoutAvailableOrderBy,
    AnalyticSessionAfterAdminAvailableOrderBy,
    AnalyticSharedFingerprintAvailableOrderBy,
    AnalyticUserCountAvailableOrderBy,
} from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticFraudRiskScoresRequestSchema } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores.request.dto';
import type { AnalyticFraudRiskScoresRequestDto } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores.request.dto';
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

    @AnalyticAdminUsersRegistrationsDoc()
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

    @AnalyticAdminUsersChurnDoc()
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

    @AnalyticAdminUsersBlockedDoc()
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

    @AnalyticAdminUsersSignUpWithDoc()
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

    @AnalyticAdminUsersSignUpFromDoc()
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

    @AnalyticAdminUsersEmailVerificationDoc()
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

    @AnalyticAdminUsersMobileVerificationDoc()
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

    @AnalyticAdminUsersStatusDistributionDoc()
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

    @AnalyticAdminUsersCountryDistributionDoc()
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

    @AnalyticAdminUsersRoleDistributionDoc()
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

    @AnalyticAdminUsersSelfDeleteDoc()
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

    @AnalyticAdminUsersClaimUsernameDoc()
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

    @AnalyticAdminUsersMobileChurnDoc()
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

    @AnalyticAdminAuthLoginFrequencyDoc()
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

    @AnalyticAdminAuthLoginMethodDoc()
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

    @AnalyticAdminAuthLoginSourceDoc()
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

    @AnalyticAdminAuthLockoutDoc()
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

    @AnalyticAdminAuthSessionRevokeDoc()
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

    @AnalyticAdminAuthConcurrentSessionsDoc()
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

    @AnalyticAdminAuthSessionsGeoDoc()
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

    @AnalyticAdminAuthSessionsUserAgentDoc()
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

    @AnalyticAdminAuthRefreshTokenVolumeDoc()
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

    @AnalyticAdminAuthLogoutRateDoc()
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

    @AnalyticAdminAuthVerificationFunnelDoc()
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

    @AnalyticAdminAuthPasswordExpiryDoc()
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

    @AnalyticAdminAuthPasswordChangeDoc()
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

    @AnalyticAdminAuthForgotPasswordConversionDoc()
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

    @AnalyticAdminAuthAdminForcePasswordDoc()
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

    @AnalyticAdminAuthTwoFactorAdoptionDoc()
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

    @AnalyticAdminAuthTwoFactorAdminResetDoc()
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

    @AnalyticAdminAuthTwoFactorVerifySuccessDoc()
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

    @AnalyticAdminAuthBackupCodeRegenerationDoc()
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

    @AnalyticAdminAuthTwoFactorAttemptDoc()
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

    @AnalyticAdminDevicesRegistrationDoc()
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

    @AnalyticAdminDevicesPlatformDoc()
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

    @AnalyticAdminDevicesPushTokenDoc()
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

    @AnalyticAdminDevicesInfoRefreshDoc()
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

    @AnalyticAdminDevicesSessionRatioDoc()
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

    @AnalyticAdminDevicesPerUserDoc()
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

    @AnalyticAdminDevicesInactivityDoc()
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

    @AnalyticAdminApiKeysLifecycleDoc()
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

    @AnalyticAdminApiKeysActiveExpiredDoc()
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

    @AnalyticAdminApiKeysTypeMixDoc()
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

    @AnalyticAdminTermPoliciesAcceptanceRateDoc()
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

    @AnalyticAdminTermPoliciesTimeToAcceptDoc()
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

    @AnalyticAdminWorkspacesCreationDoc()
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

    @AnalyticAdminWorkspacesVisibilityDoc()
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

    @AnalyticAdminWorkspacesInviteFunnelDoc()
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

    @AnalyticAdminWorkspacesJoinOutcomesDoc()
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

    @AnalyticAdminWorkspacesMembershipDoc()
    @ResponsePaging('analytic.workspacesMembership', {
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
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticWorkspaceCount>> {
        return this.analyticDashboardHttpService.workspacesMembership(
            pagination
        );
    }

    @AnalyticAdminWorkspacesActivityVolumeDoc()
    @ResponsePaging('analytic.workspacesActivityVolume', {
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
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto,
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticWorkspaceCount>> {
        return this.analyticDashboardHttpService.workspacesActivityVolume(
            pagination,
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminProjectsCreationDoc()
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

    @AnalyticAdminProjectsMembershipDoc()
    @ResponsePaging('analytic.projectsMembership', {
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
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticProjectCount>> {
        return this.analyticDashboardHttpService.projectsMembership(pagination);
    }

    @AnalyticAdminFraudCredentialStuffingDoc()
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

    @AnalyticAdminFraudCredentialStuffingListDoc()
    @ResponsePaging('analytic.fraudCredentialStuffingList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticCredentialStuffingAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticCredentialStuffing>> {
        return this.analyticFraudHttpService.credentialStuffingList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminFraudAccountTakeoverDoc()
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

    @AnalyticAdminFraudAccountTakeoverListDoc()
    @ResponsePaging('analytic.fraudAccountTakeoverList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticAccountTakeoverAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>,
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticAccountTakeover>> {
        return this.analyticFraudHttpService.accountTakeoverList(
            query.startDate,
            query.endDate,
            pagination
        );
    }

    @AnalyticAdminFraudMassRegistrationDoc()
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

    @AnalyticAdminFraudMassRegistrationListDoc()
    @ResponsePaging('analytic.fraudMassRegistrationList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticKeyCountAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticMassRegistration>> {
        return this.analyticFraudHttpService.massRegistrationList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminFraudPasswordResetEnumerationDoc()
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

    @AnalyticAdminFraudPasswordResetEnumerationListDoc()
    @ResponsePaging('analytic.fraudPasswordResetEnumerationList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticKeyCountAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ForgotPasswordWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticPasswordResetEnumeration>> {
        return this.analyticFraudHttpService.passwordResetEnumerationList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminFraudSharedFingerprintDoc()
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

    @AnalyticAdminFraudSharedFingerprintListDoc()
    @ResponsePaging('analytic.fraudSharedFingerprintList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticSharedFingerprintAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticSharedFingerprint>> {
        return this.analyticFraudHttpService.sharedFingerprintList(pagination);
    }

    @AnalyticAdminFraudSessionAfterAdminDoc()
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

    @AnalyticAdminFraudSessionAfterAdminListDoc()
    @ResponsePaging('analytic.fraudSessionAfterAdminList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticSessionAfterAdminAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticSessionAfterAdmin>> {
        return this.analyticFraudHttpService.sessionAfterAdminList(
            query.startDate,
            query.endDate,
            pagination
        );
    }

    @AnalyticAdminFraudForgotPasswordTokenAbuseDoc()
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

    @AnalyticAdminFraudForgotPasswordTokenAbuseListDoc()
    @ResponsePaging('analytic.fraudForgotPasswordTokenAbuseList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticForgotPasswordAbuseAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ForgotPasswordWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticForgotPasswordAbuse>> {
        return this.analyticFraudHttpService.forgotPasswordTokenAbuseList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminFraudRefreshSpikeDoc()
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

    @AnalyticAdminFraudRefreshSpikeListDoc()
    @ResponsePaging('analytic.fraudRefreshSpikeList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticUserCountAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticRefreshSpike>> {
        return this.analyticFraudHttpService.refreshSpikeList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminFraudBackupCodeNewDeviceDoc()
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

    @AnalyticAdminFraudBackupCodeNewDeviceListDoc()
    @ResponsePaging('analytic.fraudBackupCodeNewDeviceList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticBackupCodeNewDeviceAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticBackupCodeNewDevice>> {
        return this.analyticFraudHttpService.backupCodeNewDeviceList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminFraudApiKeyBurstDoc()
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

    @AnalyticAdminFraudApiKeyBurstListDoc()
    @ResponsePaging('analytic.fraudApiKeyBurstList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticUserCountAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticApiKeyBurst>> {
        return this.analyticFraudHttpService.apiKeyBurstList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminFraudRiskScoreDoc()
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

    @AnalyticAdminFraudRiskScoresDoc()
    @ResponsePaging('analytic.fraudRiskScores', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticFraudRiskScoreAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        @Query({ schema: AnalyticFraudRiskScoresRequestSchema })
        query: AnalyticFraudRiskScoresRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticFraudRiskScore>> {
        return this.analyticFraudHttpService.riskScores(
            query.minScore,
            pagination
        );
    }

    @AnalyticAdminAnomalyImpossibleTravelDoc()
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

    @AnalyticAdminAnomalyImpossibleTravelListDoc()
    @ResponsePaging('analytic.anomalyImpossibleTravelList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticImpossibleTravelAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>,
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticImpossibleTravel>> {
        return this.analyticAnomalyHttpService.impossibleTravelList(
            query.startDate,
            query.endDate,
            pagination
        );
    }

    @AnalyticAdminAnomalyLoginSpikeIpDoc()
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

    @AnalyticAdminAnomalyLoginSpikeIpListDoc()
    @ResponsePaging('analytic.anomalyLoginSpikeIpList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticLoginSpikeIpAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticLoginSpikeIp>> {
        return this.analyticAnomalyHttpService.loginSpikeIpList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminAnomalyFailedLoginSpikeDoc()
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

    @AnalyticAdminAnomalyFailedLoginSpikeListDoc()
    @ResponsePaging('analytic.anomalyFailedLoginSpikeList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticNearLockoutAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticNearLockout>> {
        return this.analyticAnomalyHttpService.failedLoginSpikeList(pagination);
    }

    @AnalyticAdminAnomalyDeviceProliferationDoc()
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

    @AnalyticAdminAnomalyDeviceProliferationListDoc()
    @ResponsePaging('analytic.anomalyDeviceProliferationList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDeviceProliferationAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticDeviceProliferation>> {
        return this.analyticAnomalyHttpService.deviceProliferationList(
            pagination
        );
    }

    @AnalyticAdminAnomalyLoginTimeDoc()
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

    @AnalyticAdminAnomalyLoginTimeListDoc()
    @ResponsePaging('analytic.anomalyLoginTimeList', {
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
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticLoginTimeAnomalyAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticLoginTimeAnomaly>> {
        return this.analyticAnomalyHttpService.loginTimeList(
            query.startDate,
            query.endDate,
            pagination
        );
    }
}

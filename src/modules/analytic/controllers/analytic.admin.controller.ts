import { AnalyticWorkspaceActivityVolumeListRequestSchema } from '@modules/analytic/dtos/request/analytic.workspace-activity-volume-list.request.dto';
import type { AnalyticWorkspaceActivityVolumeListRequestDto } from '@modules/analytic/dtos/request/analytic.workspace-activity-volume-list.request.dto';
import { AnalyticMassRegistrationListRequestSchema } from '@modules/analytic/dtos/request/analytic.mass-registration-list.request.dto';
import type { AnalyticMassRegistrationListRequestDto } from '@modules/analytic/dtos/request/analytic.mass-registration-list.request.dto';
import { AnalyticPasswordResetEnumerationListRequestSchema } from '@modules/analytic/dtos/request/analytic.password-reset-enumeration-list.request.dto';
import type { AnalyticPasswordResetEnumerationListRequestDto } from '@modules/analytic/dtos/request/analytic.password-reset-enumeration-list.request.dto';
import { AnalyticLoginSpikeIpListRequestSchema } from '@modules/analytic/dtos/request/analytic.login-spike-ip-list.request.dto';
import type { AnalyticLoginSpikeIpListRequestDto } from '@modules/analytic/dtos/request/analytic.login-spike-ip-list.request.dto';
import { AnalyticCredentialStuffingListRequestSchema } from '@modules/analytic/dtos/request/analytic.credential-stuffing-list.request.dto';
import type { AnalyticCredentialStuffingListRequestDto } from '@modules/analytic/dtos/request/analytic.credential-stuffing-list.request.dto';
import { AnalyticAccountTakeoverListRequestSchema } from '@modules/analytic/dtos/request/analytic.account-takeover-list.request.dto';
import type { AnalyticAccountTakeoverListRequestDto } from '@modules/analytic/dtos/request/analytic.account-takeover-list.request.dto';
import { AnalyticSessionAfterAdminListRequestSchema } from '@modules/analytic/dtos/request/analytic.session-after-admin-list.request.dto';
import type { AnalyticSessionAfterAdminListRequestDto } from '@modules/analytic/dtos/request/analytic.session-after-admin-list.request.dto';
import { AnalyticImpossibleTravelListRequestSchema } from '@modules/analytic/dtos/request/analytic.impossible-travel-list.request.dto';
import type { AnalyticImpossibleTravelListRequestDto } from '@modules/analytic/dtos/request/analytic.impossible-travel-list.request.dto';
import { AnalyticSnapshotListRequestSchema } from '@modules/analytic/dtos/request/analytic.snapshot-list.request.dto';
import type { AnalyticSnapshotListRequestDto } from '@modules/analytic/dtos/request/analytic.snapshot-list.request.dto';
import { AnalyticForgotPasswordAbuseListRequestSchema } from '@modules/analytic/dtos/request/analytic.forgot-password-abuse-list.request.dto';
import type { AnalyticForgotPasswordAbuseListRequestDto } from '@modules/analytic/dtos/request/analytic.forgot-password-abuse-list.request.dto';
import { AnalyticFraudRiskScoresListRequestSchema } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores-list.request.dto';
import type { AnalyticFraudRiskScoresListRequestDto } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores-list.request.dto';
import { AnalyticNearLockoutListRequestSchema } from '@modules/analytic/dtos/request/analytic.near-lockout-list.request.dto';
import type { AnalyticNearLockoutListRequestDto } from '@modules/analytic/dtos/request/analytic.near-lockout-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import type {
    IAnalyticAccountTakeover,
    IAnalyticActiveUsers,
    IAnalyticAnomalyDeviceProliferationSummary,
    IAnalyticAnomalyFailedLoginSpikeSummary,
    IAnalyticAnomalyImpossibleTravelSummary,
    IAnalyticAnomalyLoginSpikeIpSummary,
    IAnalyticApiKeyActiveExpired,
    IAnalyticBlockedUsers,
    IAnalyticBucketsResult,
    IAnalyticCredentialStuffing,
    IAnalyticDeviceProliferation,
    IAnalyticForgotPasswordAbuse,
    IAnalyticForgotPasswordConversion,
    IAnalyticFraudCredentialStuffingSummary,
    IAnalyticFraudRiskScore,
    IAnalyticFraudRiskScoreUser,
    IAnalyticFraudSummary,
    IAnalyticImpossibleTravel,
    IAnalyticLockoutMetrics,
    IAnalyticLoginSpikeIp,
    IAnalyticMassRegistration,
    IAnalyticMetricCount,
    IAnalyticMetricRate,
    IAnalyticMfaAdoption,
    IAnalyticNearLockout,
    IAnalyticNotificationDeliveryResult,
    IAnalyticPasswordResetEnumeration,
    IAnalyticProjectCreation,
    IAnalyticSessionAfterAdmin,
    IAnalyticSharedFingerprint,
    IAnalyticSnapshotBucketsResult,
    IAnalyticStatusCountList,
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticVerificationFunnels,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { RequestThrottleProtected } from '@common/request/decorators/request.decorator';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { AnalyticActiveUsersResponseSchema } from '@modules/analytic/dtos/response/analytic.active-users.response.dto';
import { AnalyticApiKeyActiveExpiredResponseSchema } from '@modules/analytic/dtos/response/analytic.api-key-active-expired.response.dto';
import { AnalyticBlockedUsersResponseSchema } from '@modules/analytic/dtos/response/analytic.blocked-users.response.dto';
import { AnalyticBucketsResponseSchema } from '@modules/analytic/dtos/response/analytic.buckets.response.dto';
import { AnalyticSnapshotBucketsResponseSchema } from '@modules/analytic/dtos/response/analytic.snapshot-buckets.response.dto';
import { AnalyticForgotPasswordConversionResponseSchema } from '@modules/analytic/dtos/response/analytic.forgot-password-conversion.response.dto';
import { AnalyticLockoutResponseSchema } from '@modules/analytic/dtos/response/analytic.lockout.response.dto';
import { AnalyticMetricCountResponseSchema } from '@modules/analytic/dtos/response/analytic.metric-count.response.dto';
import { AnalyticMetricRateResponseSchema } from '@modules/analytic/dtos/response/analytic.metric-rate.response.dto';
import { AnalyticNotificationDeliveryResponseSchema } from '@modules/analytic/dtos/response/analytic.notification-delivery.response.dto';
import { AnalyticProjectCreationResponseSchema } from '@modules/analytic/dtos/response/analytic.project-creation.response.dto';
import { AnalyticStatusCountResponseSchema } from '@modules/analytic/dtos/response/analytic.status-count.response.dto';
import { AnalyticTermPolicyAcceptanceRateResponseSchema } from '@modules/analytic/dtos/response/analytic.term-policy-acceptance-rate.response.dto';
import { AnalyticMfaAdoptionResponseSchema } from '@modules/analytic/dtos/response/analytic.mfa-adoption.response.dto';
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
import { AnalyticFraudCredentialStuffingSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-credential-stuffing-summary.response.dto';
import { AnalyticAnomalyImpossibleTravelSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-impossible-travel-summary.response.dto';
import { AnalyticAnomalyLoginSpikeIpSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-login-spike-ip-summary.response.dto';
import { AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-failed-login-spike-summary.response.dto';
import { AnalyticAnomalyDeviceProliferationSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-device-proliferation-summary.response.dto';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import { AnalyticFraudRiskScoreResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-risk-score.response.dto';
import { AnalyticFraudRiskScoreUserResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-risk-score-user.response.dto';
import { AnalyticAccountTakeoverResponseSchema } from '@modules/analytic/dtos/response/analytic.account-takeover.response.dto';
import { AnalyticCredentialStuffingResponseSchema } from '@modules/analytic/dtos/response/analytic.credential-stuffing.response.dto';
import { AnalyticForgotPasswordAbuseResponseSchema } from '@modules/analytic/dtos/response/analytic.forgot-password-abuse.response.dto';
import { AnalyticKeyCountResponseSchema } from '@modules/analytic/dtos/response/analytic.key-count.response.dto';
import { AnalyticSessionAfterAdminResponseSchema } from '@modules/analytic/dtos/response/analytic.session-after-admin.response.dto';
import { AnalyticSharedFingerprintResponseSchema } from '@modules/analytic/dtos/response/analytic.shared-fingerprint.response.dto';
import { AnalyticDeviceProliferationResponseSchema } from '@modules/analytic/dtos/response/analytic.device-proliferation.response.dto';
import { AnalyticImpossibleTravelResponseSchema } from '@modules/analytic/dtos/response/analytic.impossible-travel.response.dto';
import { AnalyticLoginSpikeIpResponseSchema } from '@modules/analytic/dtos/response/analytic.login-spike-ip.response.dto';
import { AnalyticNearLockoutResponseSchema } from '@modules/analytic/dtos/response/analytic.near-lockout.response.dto';
import { AnalyticUserRegistrationsUseCase } from '@modules/analytic/use-cases/analytic.user-registrations.use-case';
import { AnalyticUserChurnUseCase } from '@modules/analytic/use-cases/analytic.user-churn.use-case';
import { AnalyticUserBlockedUseCase } from '@modules/analytic/use-cases/analytic.user-blocked.use-case';
import { AnalyticUserSignUpWithUseCase } from '@modules/analytic/use-cases/analytic.user-sign-up-with.use-case';
import { AnalyticUserEmailVerificationUseCase } from '@modules/analytic/use-cases/analytic.user-email-verification.use-case';
import { AnalyticUserStatusDistributionUseCase } from '@modules/analytic/use-cases/analytic.user-status-distribution.use-case';
import { AnalyticUserCountryDistributionUseCase } from '@modules/analytic/use-cases/analytic.user-country-distribution.use-case';
import { AnalyticUserActiveUseCase } from '@modules/analytic/use-cases/analytic.user-active.use-case';
import { AnalyticUserRoleDistributionUseCase } from '@modules/analytic/use-cases/analytic.user-role-distribution.use-case';
import { AnalyticAuthLoginFrequencyUseCase } from '@modules/analytic/use-cases/analytic.auth-login-frequency.use-case';
import { AnalyticAuthLoginMethodUseCase } from '@modules/analytic/use-cases/analytic.auth-login-method.use-case';
import { AnalyticAuthLockoutUseCase } from '@modules/analytic/use-cases/analytic.auth-lockout.use-case';
import { AnalyticAuthConcurrentSessionsUseCase } from '@modules/analytic/use-cases/analytic.auth-concurrent-sessions.use-case';
import { AnalyticAuthSessionsGeoUseCase } from '@modules/analytic/use-cases/analytic.auth-sessions-geo.use-case';
import { AnalyticAuthSessionsUserAgentUseCase } from '@modules/analytic/use-cases/analytic.auth-sessions-user-agent.use-case';
import { AnalyticAuthVerificationFunnelUseCase } from '@modules/analytic/use-cases/analytic.auth-verification-funnel.use-case';
import { AnalyticAuthPasswordChangeUseCase } from '@modules/analytic/use-cases/analytic.auth-password-change.use-case';
import { AnalyticAuthForgotPasswordConversionUseCase } from '@modules/analytic/use-cases/analytic.auth-forgot-password-conversion.use-case';
import { AnalyticAuthMfaAdoptionUseCase } from '@modules/analytic/use-cases/analytic.auth-mfa-adoption.use-case';
import { AnalyticDevicePlatformUseCase } from '@modules/analytic/use-cases/analytic.device-platform.use-case';
import { AnalyticDevicePushTokenUseCase } from '@modules/analytic/use-cases/analytic.device-push-token.use-case';
import { AnalyticDevicePerUserUseCase } from '@modules/analytic/use-cases/analytic.device-per-user.use-case';
import { AnalyticDeviceInactivityUseCase } from '@modules/analytic/use-cases/analytic.device-inactivity.use-case';
import { AnalyticApiKeyActiveExpiredUseCase } from '@modules/analytic/use-cases/analytic.api-key-active-expired.use-case';
import { AnalyticTermPolicyAcceptanceRateUseCase } from '@modules/analytic/use-cases/analytic.term-policy-acceptance-rate.use-case';
import { AnalyticWorkspaceCreationUseCase } from '@modules/analytic/use-cases/analytic.workspace-creation.use-case';
import { AnalyticWorkspaceInviteFunnelUseCase } from '@modules/analytic/use-cases/analytic.workspace-invite-funnel.use-case';
import { AnalyticWorkspaceJoinOutcomesUseCase } from '@modules/analytic/use-cases/analytic.workspace-join-outcomes.use-case';
import { AnalyticWorkspaceMembershipListUseCase } from '@modules/analytic/use-cases/analytic.workspace-membership-list.use-case';
import { AnalyticWorkspaceActivityVolumeListUseCase } from '@modules/analytic/use-cases/analytic.workspace-activity-volume-list.use-case';
import { AnalyticProjectCreationUseCase } from '@modules/analytic/use-cases/analytic.project-creation.use-case';
import { AnalyticNotificationDeliveryUseCase } from '@modules/analytic/use-cases/analytic.notification-delivery.use-case';
import { AnalyticCredentialStuffingSummaryUseCase } from '@modules/analytic/use-cases/analytic.credential-stuffing-summary.use-case';
import { AnalyticCredentialStuffingListUseCase } from '@modules/analytic/use-cases/analytic.credential-stuffing-list.use-case';
import { AnalyticAccountTakeoverSummaryUseCase } from '@modules/analytic/use-cases/analytic.account-takeover-summary.use-case';
import { AnalyticAccountTakeoverListUseCase } from '@modules/analytic/use-cases/analytic.account-takeover-list.use-case';
import { AnalyticMassRegistrationSummaryUseCase } from '@modules/analytic/use-cases/analytic.mass-registration-summary.use-case';
import { AnalyticMassRegistrationListUseCase } from '@modules/analytic/use-cases/analytic.mass-registration-list.use-case';
import { AnalyticPasswordResetEnumerationSummaryUseCase } from '@modules/analytic/use-cases/analytic.password-reset-enumeration-summary.use-case';
import { AnalyticPasswordResetEnumerationListUseCase } from '@modules/analytic/use-cases/analytic.password-reset-enumeration-list.use-case';
import { AnalyticSharedFingerprintSummaryUseCase } from '@modules/analytic/use-cases/analytic.shared-fingerprint-summary.use-case';
import { AnalyticSharedFingerprintListUseCase } from '@modules/analytic/use-cases/analytic.shared-fingerprint-list.use-case';
import { AnalyticSessionAfterAdminSummaryUseCase } from '@modules/analytic/use-cases/analytic.session-after-admin-summary.use-case';
import { AnalyticSessionAfterAdminListUseCase } from '@modules/analytic/use-cases/analytic.session-after-admin-list.use-case';
import { AnalyticForgotPasswordTokenAbuseSummaryUseCase } from '@modules/analytic/use-cases/analytic.forgot-password-token-abuse-summary.use-case';
import { AnalyticForgotPasswordTokenAbuseListUseCase } from '@modules/analytic/use-cases/analytic.forgot-password-token-abuse-list.use-case';
import { AnalyticRiskScoreUseCase } from '@modules/analytic/use-cases/analytic.risk-score.use-case';
import { AnalyticRiskScoreListUseCase } from '@modules/analytic/use-cases/analytic.risk-score-list.use-case';
import { AnalyticImpossibleTravelSummaryUseCase } from '@modules/analytic/use-cases/analytic.impossible-travel-summary.use-case';
import { AnalyticImpossibleTravelListUseCase } from '@modules/analytic/use-cases/analytic.impossible-travel-list.use-case';
import { AnalyticLoginSpikeIpSummaryUseCase } from '@modules/analytic/use-cases/analytic.login-spike-ip-summary.use-case';
import { AnalyticLoginSpikeIpListUseCase } from '@modules/analytic/use-cases/analytic.login-spike-ip-list.use-case';
import { AnalyticFailedLoginSpikeSummaryUseCase } from '@modules/analytic/use-cases/analytic.failed-login-spike-summary.use-case';
import { AnalyticFailedLoginSpikeListUseCase } from '@modules/analytic/use-cases/analytic.failed-login-spike-list.use-case';
import { AnalyticDeviceProliferationSummaryUseCase } from '@modules/analytic/use-cases/analytic.device-proliferation-summary.use-case';
import { AnalyticDeviceProliferationListUseCase } from '@modules/analytic/use-cases/analytic.device-proliferation-list.use-case';

@ApiTags('modules.admin.analytic')
@Controller({
    version: '1',
    path: '/analytic',
})
export class AnalyticAdminController {
    constructor(
        private readonly analyticUserRegistrationsUseCase: AnalyticUserRegistrationsUseCase,
        private readonly analyticUserChurnUseCase: AnalyticUserChurnUseCase,
        private readonly analyticUserBlockedUseCase: AnalyticUserBlockedUseCase,
        private readonly analyticUserSignUpWithUseCase: AnalyticUserSignUpWithUseCase,
        private readonly analyticUserEmailVerificationUseCase: AnalyticUserEmailVerificationUseCase,
        private readonly analyticUserStatusDistributionUseCase: AnalyticUserStatusDistributionUseCase,
        private readonly analyticUserCountryDistributionUseCase: AnalyticUserCountryDistributionUseCase,
        private readonly analyticUserRoleDistributionUseCase: AnalyticUserRoleDistributionUseCase,
        private readonly analyticUserActiveUseCase: AnalyticUserActiveUseCase,
        private readonly analyticAuthLoginFrequencyUseCase: AnalyticAuthLoginFrequencyUseCase,
        private readonly analyticAuthLoginMethodUseCase: AnalyticAuthLoginMethodUseCase,
        private readonly analyticAuthLockoutUseCase: AnalyticAuthLockoutUseCase,
        private readonly analyticAuthConcurrentSessionsUseCase: AnalyticAuthConcurrentSessionsUseCase,
        private readonly analyticAuthSessionsGeoUseCase: AnalyticAuthSessionsGeoUseCase,
        private readonly analyticAuthSessionsUserAgentUseCase: AnalyticAuthSessionsUserAgentUseCase,
        private readonly analyticAuthVerificationFunnelUseCase: AnalyticAuthVerificationFunnelUseCase,
        private readonly analyticAuthPasswordChangeUseCase: AnalyticAuthPasswordChangeUseCase,
        private readonly analyticAuthForgotPasswordConversionUseCase: AnalyticAuthForgotPasswordConversionUseCase,
        private readonly analyticAuthMfaAdoptionUseCase: AnalyticAuthMfaAdoptionUseCase,
        private readonly analyticDevicePlatformUseCase: AnalyticDevicePlatformUseCase,
        private readonly analyticDevicePushTokenUseCase: AnalyticDevicePushTokenUseCase,
        private readonly analyticDevicePerUserUseCase: AnalyticDevicePerUserUseCase,
        private readonly analyticDeviceInactivityUseCase: AnalyticDeviceInactivityUseCase,
        private readonly analyticApiKeyActiveExpiredUseCase: AnalyticApiKeyActiveExpiredUseCase,
        private readonly analyticTermPolicyAcceptanceRateUseCase: AnalyticTermPolicyAcceptanceRateUseCase,
        private readonly analyticWorkspaceCreationUseCase: AnalyticWorkspaceCreationUseCase,
        private readonly analyticWorkspaceInviteFunnelUseCase: AnalyticWorkspaceInviteFunnelUseCase,
        private readonly analyticWorkspaceJoinOutcomesUseCase: AnalyticWorkspaceJoinOutcomesUseCase,
        private readonly analyticWorkspaceMembershipListUseCase: AnalyticWorkspaceMembershipListUseCase,
        private readonly analyticWorkspaceActivityVolumeListUseCase: AnalyticWorkspaceActivityVolumeListUseCase,
        private readonly analyticProjectCreationUseCase: AnalyticProjectCreationUseCase,
        private readonly analyticNotificationDeliveryUseCase: AnalyticNotificationDeliveryUseCase,
        private readonly analyticCredentialStuffingSummaryUseCase: AnalyticCredentialStuffingSummaryUseCase,
        private readonly analyticCredentialStuffingListUseCase: AnalyticCredentialStuffingListUseCase,
        private readonly analyticAccountTakeoverSummaryUseCase: AnalyticAccountTakeoverSummaryUseCase,
        private readonly analyticAccountTakeoverListUseCase: AnalyticAccountTakeoverListUseCase,
        private readonly analyticMassRegistrationSummaryUseCase: AnalyticMassRegistrationSummaryUseCase,
        private readonly analyticMassRegistrationListUseCase: AnalyticMassRegistrationListUseCase,
        private readonly analyticPasswordResetEnumerationSummaryUseCase: AnalyticPasswordResetEnumerationSummaryUseCase,
        private readonly analyticPasswordResetEnumerationListUseCase: AnalyticPasswordResetEnumerationListUseCase,
        private readonly analyticSharedFingerprintSummaryUseCase: AnalyticSharedFingerprintSummaryUseCase,
        private readonly analyticSharedFingerprintListUseCase: AnalyticSharedFingerprintListUseCase,
        private readonly analyticSessionAfterAdminSummaryUseCase: AnalyticSessionAfterAdminSummaryUseCase,
        private readonly analyticSessionAfterAdminListUseCase: AnalyticSessionAfterAdminListUseCase,
        private readonly analyticForgotPasswordTokenAbuseSummaryUseCase: AnalyticForgotPasswordTokenAbuseSummaryUseCase,
        private readonly analyticForgotPasswordTokenAbuseListUseCase: AnalyticForgotPasswordTokenAbuseListUseCase,
        private readonly analyticRiskScoreUseCase: AnalyticRiskScoreUseCase,
        private readonly analyticRiskScoreListUseCase: AnalyticRiskScoreListUseCase,
        private readonly analyticImpossibleTravelSummaryUseCase: AnalyticImpossibleTravelSummaryUseCase,
        private readonly analyticImpossibleTravelListUseCase: AnalyticImpossibleTravelListUseCase,
        private readonly analyticLoginSpikeIpSummaryUseCase: AnalyticLoginSpikeIpSummaryUseCase,
        private readonly analyticLoginSpikeIpListUseCase: AnalyticLoginSpikeIpListUseCase,
        private readonly analyticFailedLoginSpikeSummaryUseCase: AnalyticFailedLoginSpikeSummaryUseCase,
        private readonly analyticFailedLoginSpikeListUseCase: AnalyticFailedLoginSpikeListUseCase,
        private readonly analyticDeviceProliferationSummaryUseCase: AnalyticDeviceProliferationSummaryUseCase,
        private readonly analyticDeviceProliferationListUseCase: AnalyticDeviceProliferationListUseCase
    ) {}

    @Doc({ summary: 'admin get user registration count by date range' })
    @Response('analytic.userRegistrations', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/user/registrations')
    async userRegistrations(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticUserRegistrationsUseCase.execute(query);
    }

    @Doc({ summary: 'admin get user churn rate by date range' })
    @Response('analytic.userChurn', {
        schema: AnalyticMetricRateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/user/churn')
    async userChurn(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        return this.analyticUserChurnUseCase.execute(query);
    }

    @Doc({ summary: 'admin get blocked user counts by date range' })
    @Response('analytic.userBlocked', {
        schema: AnalyticBlockedUsersResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/user/blocked')
    async userBlocked(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBlockedUsers>> {
        return this.analyticUserBlockedUseCase.execute(query);
    }

    @Doc({ summary: 'admin get user sign up method distribution' })
    @Response('analytic.userSignUpWith', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/user/sign-up-with')
    async userSignUpWith(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticUserSignUpWithUseCase.execute(query);
    }

    @Doc({ summary: 'admin get user email verification rate' })
    @Response('analytic.userEmailVerification', {
        schema: AnalyticMetricRateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/user/email-verification')
    async userEmailVerification(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        return this.analyticUserEmailVerificationUseCase.execute(query);
    }

    @Doc({ summary: 'admin get user status distribution' })
    @Response('analytic.userStatusDistribution', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/user/status-distribution')
    async userStatusDistribution(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        return this.analyticUserStatusDistributionUseCase.execute();
    }

    @Doc({ summary: 'admin get user country distribution' })
    @Response('analytic.userCountryDistribution', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/user/country-distribution')
    async userCountryDistribution(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        return this.analyticUserCountryDistributionUseCase.execute();
    }

    @Doc({ summary: 'admin get user role distribution' })
    @Response('analytic.userRoleDistribution', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/user/role-distribution')
    async userRoleDistribution(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        return this.analyticUserRoleDistributionUseCase.execute();
    }

    @Doc({
        summary: 'admin get daily, weekly, and monthly active users',
        description:
            'Counts live users whose last sign-in or token refresh falls within the last day, 7 days, and 30 days.',
    })
    @Response('analytic.userActive', {
        schema: AnalyticActiveUsersResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/user/active')
    async userActive(): Promise<IResponseReturn<IAnalyticActiveUsers>> {
        return this.analyticUserActiveUseCase.execute();
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/login-frequency')
    async authLoginFrequency(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticAuthLoginFrequencyUseCase.execute(query);
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/login-method')
    async authLoginMethod(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticAuthLoginMethodUseCase.execute(query);
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/lockout')
    async authLockout(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticLockoutMetrics>> {
        return this.analyticAuthLockoutUseCase.execute(query);
    }

    @Doc({ summary: 'admin get concurrent session distribution' })
    @Response('analytic.authConcurrentSessions', {
        schema: AnalyticSnapshotBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/concurrent-sessions')
    async authConcurrentSessions(): Promise<
        IResponseReturn<IAnalyticSnapshotBucketsResult>
    > {
        return this.analyticAuthConcurrentSessionsUseCase.execute();
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/sessions-geo')
    async authSessionsGeo(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticAuthSessionsGeoUseCase.execute(query);
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/sessions-user-agent')
    async authSessionsUserAgent(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticAuthSessionsUserAgentUseCase.execute(query);
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/verification-funnel')
    async authVerificationFunnel(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticVerificationFunnels>> {
        return this.analyticAuthVerificationFunnelUseCase.execute(query);
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/password-change')
    async authPasswordChange(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticAuthPasswordChangeUseCase.execute(query);
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/forgot-password-conversion')
    async authForgotPasswordConversion(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticForgotPasswordConversion>> {
        return this.analyticAuthForgotPasswordConversionUseCase.execute(query);
    }

    @Doc({ summary: 'admin get two factor adoption snapshot' })
    @Response('analytic.authMfaAdoption', {
        schema: AnalyticMfaAdoptionResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/mfa-adoption')
    async authMfaAdoption(): Promise<IResponseReturn<IAnalyticMfaAdoption>> {
        return this.analyticAuthMfaAdoptionUseCase.execute();
    }

    @Doc({ summary: 'admin get device platform distribution' })
    @Response('analytic.devicePlatform', {
        schema: AnalyticBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/device/platform')
    async devicePlatform(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticDevicePlatformUseCase.execute();
    }

    @Doc({ summary: 'admin get device push token coverage rate' })
    @Response('analytic.devicePushToken', {
        schema: AnalyticMetricRateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/device/push-token')
    async devicePushToken(): Promise<IResponseReturn<IAnalyticMetricRate>> {
        return this.analyticDevicePushTokenUseCase.execute();
    }

    @Doc({ summary: 'admin get device per user distribution' })
    @Response('analytic.devicePerUser', {
        schema: AnalyticSnapshotBucketsResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/device/per-user')
    async devicePerUser(): Promise<
        IResponseReturn<IAnalyticSnapshotBucketsResult>
    > {
        return this.analyticDevicePerUserUseCase.execute();
    }

    @Doc({ summary: 'admin get inactive device count' })
    @Response('analytic.deviceInactivity', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/device/inactivity')
    async deviceInactivity(): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDeviceInactivityUseCase.execute();
    }

    @Doc({ summary: 'admin get active and expired api key counts' })
    @Response('analytic.apiKeyActiveExpired', {
        schema: AnalyticApiKeyActiveExpiredResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/api-key/active-expired')
    async apiKeyActiveExpired(): Promise<
        IResponseReturn<IAnalyticApiKeyActiveExpired>
    > {
        return this.analyticApiKeyActiveExpiredUseCase.execute();
    }

    @Doc({ summary: 'admin get term policy acceptance rate' })
    @Response('analytic.termPolicyAcceptanceRate', {
        schema: AnalyticTermPolicyAcceptanceRateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/term-policy/acceptance-rate')
    async termPolicyAcceptanceRate(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticTermPolicyAcceptanceRate>> {
        return this.analyticTermPolicyAcceptanceRateUseCase.execute(query);
    }

    @Doc({ summary: 'admin get workspace creation count by date range' })
    @Response('analytic.workspaceCreation', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspace/creation')
    async workspaceCreation(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticWorkspaceCreationUseCase.execute(query);
    }

    @Doc({ summary: 'admin get workspace invite funnel by date range' })
    @Response('analytic.workspaceInviteFunnel', {
        schema: AnalyticStatusCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspace/invite-funnel')
    async workspaceInviteFunnel(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        return this.analyticWorkspaceInviteFunnelUseCase.execute(query);
    }

    @Doc({ summary: 'admin get workspace join request outcomes by date range' })
    @Response('analytic.workspaceJoinOutcomes', {
        schema: AnalyticStatusCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspace/join-outcomes')
    async workspaceJoinOutcomes(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        return this.analyticWorkspaceJoinOutcomesUseCase.execute(query);
    }

    @Doc({
        summary: 'admin get member counts per workspace',
        description:
            'orderBy presets: highestValue (member count descending, default), key (workspace id ascending).',
    })
    @ResponsePagination('analytic.workspaceMembershipList', {
        schema: AnalyticWorkspaceCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspace/membership/list')
    async workspaceMembershipList(
        @Query({ schema: AnalyticSnapshotListRequestSchema })
        query: AnalyticSnapshotListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return this.analyticWorkspaceMembershipListUseCase.execute(query);
    }

    @Doc({
        summary: 'admin get activity volume per workspace by date range',
        description: 'orderBy presets: mostCount (count descending, default).',
    })
    @ResponsePagination('analytic.workspaceActivityVolumeList', {
        schema: AnalyticWorkspaceCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspace/activity-volume/list')
    async workspaceActivityVolumeList(
        @Query({ schema: AnalyticWorkspaceActivityVolumeListRequestSchema })
        query: AnalyticWorkspaceActivityVolumeListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return this.analyticWorkspaceActivityVolumeListUseCase.execute(query);
    }

    @Doc({ summary: 'admin get project creation counts by date range' })
    @Response('analytic.projectCreation', {
        schema: AnalyticProjectCreationResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/project/creation')
    async projectCreation(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticProjectCreation>> {
        return this.analyticProjectCreationUseCase.execute(query);
    }

    @Doc({
        summary: 'admin get notification delivery counts per channel',
        description:
            'Counts delivery rows created in the date range per channel. Sent means sentAt is set; failed means processedAt is set and sentAt is null; pending means both are null. A delivery being sent or retried counts as failed until sentAt lands, because the email and sms flows stamp processedAt before the send.',
    })
    @Response('analytic.notificationDelivery', {
        schema: AnalyticNotificationDeliveryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/notification/delivery')
    async notificationDelivery(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticNotificationDeliveryResult>> {
        return this.analyticNotificationDeliveryUseCase.execute(query);
    }

    @Doc({ summary: 'admin get credential stuffing fraud summary' })
    @Response('analytic.fraudCredentialStuffing', {
        schema: AnalyticFraudCredentialStuffingSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/credential-stuffing')
    async credentialStuffing(): Promise<
        IResponseReturn<IAnalyticFraudCredentialStuffingSummary>
    > {
        return this.analyticCredentialStuffingSummaryUseCase.execute();
    }

    @Doc({
        summary: 'admin get all credential stuffing fraud detections',
        description:
            'orderBy presets: mostUsers (uniqueUsers descending, default), mostFailures (failCount descending), ipAddress (ipAddress ascending).',
    })
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/credential-stuffing/list')
    async credentialStuffingList(
        @Query({ schema: AnalyticCredentialStuffingListRequestSchema })
        query: AnalyticCredentialStuffingListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticCredentialStuffing>> {
        return this.analyticCredentialStuffingListUseCase.execute(query);
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/account-takeover')
    async accountTakeover(): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticAccountTakeoverSummaryUseCase.execute();
    }

    @Doc({
        summary: 'admin get all account takeover fraud detections',
        description:
            'orderBy presets: latest (passwordChangedAt descending, default), userId (userId ascending).',
    })
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/account-takeover/list')
    async accountTakeoverList(
        @Query({ schema: AnalyticAccountTakeoverListRequestSchema })
        query: AnalyticAccountTakeoverListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticAccountTakeover>> {
        return this.analyticAccountTakeoverListUseCase.execute(query);
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/mass-registration')
    async massRegistration(): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticMassRegistrationSummaryUseCase.execute();
    }

    @Doc({
        summary: 'admin get all mass registration fraud detections',
        description:
            'orderBy presets: mostCount (count descending, default), key (key ascending).',
    })
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/mass-registration/list')
    async massRegistrationList(
        @Query({ schema: AnalyticMassRegistrationListRequestSchema })
        query: AnalyticMassRegistrationListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticMassRegistration>> {
        return this.analyticMassRegistrationListUseCase.execute(query);
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/password-reset-enumeration')
    async passwordResetEnumeration(): Promise<
        IResponseReturn<IAnalyticFraudSummary>
    > {
        return this.analyticPasswordResetEnumerationSummaryUseCase.execute();
    }

    @Doc({
        summary: 'admin get all password reset enumeration fraud detections',
        description:
            'orderBy presets: mostCount (count descending, default), key (key ascending).',
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/password-reset-enumeration/list')
    async passwordResetEnumerationList(
        @Query({ schema: AnalyticPasswordResetEnumerationListRequestSchema })
        query: AnalyticPasswordResetEnumerationListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticPasswordResetEnumeration>> {
        return this.analyticPasswordResetEnumerationListUseCase.execute(query);
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/shared-fingerprint')
    async sharedFingerprint(): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticSharedFingerprintSummaryUseCase.execute();
    }

    @Doc({
        summary: 'admin get all shared device fingerprint fraud detections',
        description:
            'orderBy presets: highestValue (userCount descending, default), key (fingerprint ascending).',
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/shared-fingerprint/list')
    async sharedFingerprintList(
        @Query({ schema: AnalyticSnapshotListRequestSchema })
        query: AnalyticSnapshotListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticSharedFingerprint>> {
        return this.analyticSharedFingerprintListUseCase.execute(query);
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/session-after-admin')
    async sessionAfterAdmin(): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticSessionAfterAdminSummaryUseCase.execute();
    }

    @Doc({
        summary: 'admin get all session after admin action fraud detections',
        description:
            'orderBy presets: latest (revokedAt descending, default), recentLogin (loginAt descending), userId (userId ascending).',
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/session-after-admin/list')
    async sessionAfterAdminList(
        @Query({ schema: AnalyticSessionAfterAdminListRequestSchema })
        query: AnalyticSessionAfterAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticSessionAfterAdmin>> {
        return this.analyticSessionAfterAdminListUseCase.execute(query);
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/forgot-password-token-abuse')
    async forgotPasswordTokenAbuse(): Promise<
        IResponseReturn<IAnalyticFraudSummary>
    > {
        return this.analyticForgotPasswordTokenAbuseSummaryUseCase.execute();
    }

    @Doc({
        summary: 'admin get all forgot password token abuse fraud detections',
        description:
            'orderBy presets: mostTokens (tokenCount descending, default), userId (userId ascending).',
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/forgot-password-token-abuse/list')
    async forgotPasswordTokenAbuseList(
        @Query({ schema: AnalyticForgotPasswordAbuseListRequestSchema })
        query: AnalyticForgotPasswordAbuseListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticForgotPasswordAbuse>> {
        return this.analyticForgotPasswordTokenAbuseListUseCase.execute(query);
    }

    @Doc({
        summary: 'admin get all user fraud risk scores',
        description:
            'orderBy presets: highestValue (score descending, default), key (userId ascending).',
    })
    @ResponsePagination('analytic.fraudRiskScoreList', {
        schema: AnalyticFraudRiskScoreResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/risk-score/list')
    async riskScoreList(
        @Query({ schema: AnalyticFraudRiskScoresListRequestSchema })
        query: AnalyticFraudRiskScoresListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticFraudRiskScore>> {
        return this.analyticRiskScoreListUseCase.execute(query);
    }

    @Doc({ summary: 'admin get fraud risk score of a user (report-only)' })
    @Response('analytic.fraudRiskScore', {
        schema: AnalyticFraudRiskScoreUserResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/risk-score/user/:userId')
    async riskScore(
        @Param('userId', { schema: RequestMongoIdSchema })
        userId: string
    ): Promise<IResponseReturn<IAnalyticFraudRiskScoreUser>> {
        return this.analyticRiskScoreUseCase.execute(userId);
    }

    @Doc({ summary: 'admin get impossible travel anomaly summary' })
    @Response('analytic.anomalyImpossibleTravel', {
        schema: AnalyticAnomalyImpossibleTravelSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/impossible-travel')
    async impossibleTravel(): Promise<
        IResponseReturn<IAnalyticAnomalyImpossibleTravelSummary>
    > {
        return this.analyticImpossibleTravelSummaryUseCase.execute();
    }

    @Doc({
        summary: 'admin get all impossible travel anomaly detections',
        description:
            "orderBy presets: highestValue (distanceKm descending, default), recent (the later session's creation time, descending), key (userId ascending).",
    })
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/impossible-travel/list')
    async impossibleTravelList(
        @Query({ schema: AnalyticImpossibleTravelListRequestSchema })
        query: AnalyticImpossibleTravelListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticImpossibleTravel>> {
        return this.analyticImpossibleTravelListUseCase.execute(query);
    }

    @Doc({ summary: 'admin get login spike by ip anomaly summary' })
    @Response('analytic.anomalyLoginSpikeIp', {
        schema: AnalyticAnomalyLoginSpikeIpSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/login-spike-ip')
    async loginSpikeIp(): Promise<
        IResponseReturn<IAnalyticAnomalyLoginSpikeIpSummary>
    > {
        return this.analyticLoginSpikeIpSummaryUseCase.execute();
    }

    @Doc({
        summary: 'admin get all login spike by ip anomaly detections',
        description:
            'orderBy presets: mostUsers (uniqueUsers descending, default), mostAttempts (attempts descending), ipAddress (ipAddress ascending).',
    })
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/login-spike-ip/list')
    async loginSpikeIpList(
        @Query({ schema: AnalyticLoginSpikeIpListRequestSchema })
        query: AnalyticLoginSpikeIpListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticLoginSpikeIp>> {
        return this.analyticLoginSpikeIpListUseCase.execute(query);
    }

    @Doc({ summary: 'admin get failed login spike anomaly summary' })
    @Response('analytic.anomalyFailedLoginSpike', {
        schema: AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/failed-login-spike')
    async failedLoginSpike(): Promise<
        IResponseReturn<IAnalyticAnomalyFailedLoginSpikeSummary>
    > {
        return this.analyticFailedLoginSpikeSummaryUseCase.execute();
    }

    @Doc({
        summary: 'admin get all failed login spike anomaly detections',
        description:
            'orderBy presets: latest (createdAt descending, default), id (id descending).',
    })
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/failed-login-spike/list')
    async failedLoginSpikeList(
        @Query({ schema: AnalyticNearLockoutListRequestSchema })
        query: AnalyticNearLockoutListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>> {
        return this.analyticFailedLoginSpikeListUseCase.execute(query);
    }

    @Doc({ summary: 'admin get device proliferation anomaly summary' })
    @Response('analytic.anomalyDeviceProliferation', {
        schema: AnalyticAnomalyDeviceProliferationSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/device-proliferation')
    async deviceProliferation(): Promise<
        IResponseReturn<IAnalyticAnomalyDeviceProliferationSummary>
    > {
        return this.analyticDeviceProliferationSummaryUseCase.execute();
    }

    @Doc({
        summary: 'admin get all device proliferation anomaly detections',
        description:
            'orderBy presets: highestValue (deviceCount descending, default), key (userId ascending).',
    })
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
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/device-proliferation/list')
    async deviceProliferationList(
        @Query({ schema: AnalyticSnapshotListRequestSchema })
        query: AnalyticSnapshotListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticDeviceProliferation>> {
        return this.analyticDeviceProliferationListUseCase.execute(query);
    }
}

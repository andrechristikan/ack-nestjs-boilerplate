import { AnalyticWorkspacesMembershipListRequestSchema } from '@modules/analytic/dtos/request/analytic.workspaces-membership-list.request.dto';
import type { AnalyticWorkspacesMembershipListRequestDto } from '@modules/analytic/dtos/request/analytic.workspaces-membership-list.request.dto';
import { AnalyticWorkspacesActivityVolumeListRequestSchema } from '@modules/analytic/dtos/request/analytic.workspaces-activity-volume-list.request.dto';
import type { AnalyticWorkspacesActivityVolumeListRequestDto } from '@modules/analytic/dtos/request/analytic.workspaces-activity-volume-list.request.dto';
import { AnalyticProjectsMembershipListRequestSchema } from '@modules/analytic/dtos/request/analytic.projects-membership-list.request.dto';
import type { AnalyticProjectsMembershipListRequestDto } from '@modules/analytic/dtos/request/analytic.projects-membership-list.request.dto';
import { AnalyticCredentialStuffingListRequestSchema } from '@modules/analytic/dtos/request/analytic.credential-stuffing-list.request.dto';
import type { AnalyticCredentialStuffingListRequestDto } from '@modules/analytic/dtos/request/analytic.credential-stuffing-list.request.dto';
import { AnalyticAccountTakeoverListRequestSchema } from '@modules/analytic/dtos/request/analytic.account-takeover-list.request.dto';
import type { AnalyticAccountTakeoverListRequestDto } from '@modules/analytic/dtos/request/analytic.account-takeover-list.request.dto';
import { AnalyticMassRegistrationListRequestSchema } from '@modules/analytic/dtos/request/analytic.mass-registration-list.request.dto';
import type { AnalyticMassRegistrationListRequestDto } from '@modules/analytic/dtos/request/analytic.mass-registration-list.request.dto';
import { AnalyticPasswordResetEnumerationListRequestSchema } from '@modules/analytic/dtos/request/analytic.password-reset-enumeration-list.request.dto';
import type { AnalyticPasswordResetEnumerationListRequestDto } from '@modules/analytic/dtos/request/analytic.password-reset-enumeration-list.request.dto';
import { AnalyticSharedFingerprintListRequestSchema } from '@modules/analytic/dtos/request/analytic.shared-fingerprint-list.request.dto';
import type { AnalyticSharedFingerprintListRequestDto } from '@modules/analytic/dtos/request/analytic.shared-fingerprint-list.request.dto';
import { AnalyticSessionAfterAdminListRequestSchema } from '@modules/analytic/dtos/request/analytic.session-after-admin-list.request.dto';
import type { AnalyticSessionAfterAdminListRequestDto } from '@modules/analytic/dtos/request/analytic.session-after-admin-list.request.dto';
import { AnalyticForgotPasswordAbuseListRequestSchema } from '@modules/analytic/dtos/request/analytic.forgot-password-abuse-list.request.dto';
import type { AnalyticForgotPasswordAbuseListRequestDto } from '@modules/analytic/dtos/request/analytic.forgot-password-abuse-list.request.dto';
import { AnalyticRefreshSpikeListRequestSchema } from '@modules/analytic/dtos/request/analytic.refresh-spike-list.request.dto';
import type { AnalyticRefreshSpikeListRequestDto } from '@modules/analytic/dtos/request/analytic.refresh-spike-list.request.dto';
import { AnalyticBackupCodeNewDeviceListRequestSchema } from '@modules/analytic/dtos/request/analytic.backup-code-new-device-list.request.dto';
import type { AnalyticBackupCodeNewDeviceListRequestDto } from '@modules/analytic/dtos/request/analytic.backup-code-new-device-list.request.dto';
import { AnalyticApiKeyBurstListRequestSchema } from '@modules/analytic/dtos/request/analytic.api-key-burst-list.request.dto';
import type { AnalyticApiKeyBurstListRequestDto } from '@modules/analytic/dtos/request/analytic.api-key-burst-list.request.dto';
import { AnalyticFraudRiskScoresListRequestSchema } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores-list.request.dto';
import type { AnalyticFraudRiskScoresListRequestDto } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores-list.request.dto';
import { AnalyticImpossibleTravelListRequestSchema } from '@modules/analytic/dtos/request/analytic.impossible-travel-list.request.dto';
import type { AnalyticImpossibleTravelListRequestDto } from '@modules/analytic/dtos/request/analytic.impossible-travel-list.request.dto';
import { AnalyticLoginSpikeIpListRequestSchema } from '@modules/analytic/dtos/request/analytic.login-spike-ip-list.request.dto';
import type { AnalyticLoginSpikeIpListRequestDto } from '@modules/analytic/dtos/request/analytic.login-spike-ip-list.request.dto';
import { AnalyticNearLockoutListRequestSchema } from '@modules/analytic/dtos/request/analytic.near-lockout-list.request.dto';
import type { AnalyticNearLockoutListRequestDto } from '@modules/analytic/dtos/request/analytic.near-lockout-list.request.dto';
import { AnalyticDeviceProliferationListRequestSchema } from '@modules/analytic/dtos/request/analytic.device-proliferation-list.request.dto';
import type { AnalyticDeviceProliferationListRequestDto } from '@modules/analytic/dtos/request/analytic.device-proliferation-list.request.dto';
import { AnalyticLoginTimeAnomalyListRequestSchema } from '@modules/analytic/dtos/request/analytic.login-time-anomaly-list.request.dto';
import type { AnalyticLoginTimeAnomalyListRequestDto } from '@modules/analytic/dtos/request/analytic.login-time-anomaly-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import type {
    IAnalyticAccountTakeover,
    IAnalyticAnomalyDeviceProliferationSummary,
    IAnalyticAnomalyFailedLoginSpikeSummary,
    IAnalyticAnomalyImpossibleTravelSummary,
    IAnalyticAnomalyLoginSpikeIpSummary,
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
    IAnalyticFraudCredentialStuffingSummary,
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
import { AnalyticAnomalySummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';
import { AnalyticDeviceProliferationResponseSchema } from '@modules/analytic/dtos/response/analytic.device-proliferation.response.dto';
import { AnalyticImpossibleTravelResponseSchema } from '@modules/analytic/dtos/response/analytic.impossible-travel.response.dto';
import { AnalyticLoginSpikeIpResponseSchema } from '@modules/analytic/dtos/response/analytic.login-spike-ip.response.dto';
import { AnalyticLoginTimeAnomalyResponseSchema } from '@modules/analytic/dtos/response/analytic.login-time-anomaly.response.dto';
import { AnalyticNearLockoutResponseSchema } from '@modules/analytic/dtos/response/analytic.near-lockout.response.dto';
import { AnalyticUsersRegistrationsUseCase } from '@modules/analytic/use-cases/analytic.users-registrations.use-case';
import { AnalyticUsersChurnUseCase } from '@modules/analytic/use-cases/analytic.users-churn.use-case';
import { AnalyticUsersBlockedUseCase } from '@modules/analytic/use-cases/analytic.users-blocked.use-case';
import { AnalyticUsersSignUpWithUseCase } from '@modules/analytic/use-cases/analytic.users-sign-up-with.use-case';
import { AnalyticUsersSignUpFromUseCase } from '@modules/analytic/use-cases/analytic.users-sign-up-from.use-case';
import { AnalyticUsersEmailVerificationUseCase } from '@modules/analytic/use-cases/analytic.users-email-verification.use-case';
import { AnalyticUsersMobileVerificationUseCase } from '@modules/analytic/use-cases/analytic.users-mobile-verification.use-case';
import { AnalyticUsersStatusDistributionUseCase } from '@modules/analytic/use-cases/analytic.users-status-distribution.use-case';
import { AnalyticUsersCountryDistributionUseCase } from '@modules/analytic/use-cases/analytic.users-country-distribution.use-case';
import { AnalyticUsersRoleDistributionUseCase } from '@modules/analytic/use-cases/analytic.users-role-distribution.use-case';
import { AnalyticUsersSelfDeleteUseCase } from '@modules/analytic/use-cases/analytic.users-self-delete.use-case';
import { AnalyticUsersClaimUsernameUseCase } from '@modules/analytic/use-cases/analytic.users-claim-username.use-case';
import { AnalyticUsersMobileChurnUseCase } from '@modules/analytic/use-cases/analytic.users-mobile-churn.use-case';
import { AnalyticAuthLoginFrequencyUseCase } from '@modules/analytic/use-cases/analytic.auth-login-frequency.use-case';
import { AnalyticAuthLoginMethodUseCase } from '@modules/analytic/use-cases/analytic.auth-login-method.use-case';
import { AnalyticAuthLoginSourceUseCase } from '@modules/analytic/use-cases/analytic.auth-login-source.use-case';
import { AnalyticAuthLockoutUseCase } from '@modules/analytic/use-cases/analytic.auth-lockout.use-case';
import { AnalyticAuthSessionRevokeUseCase } from '@modules/analytic/use-cases/analytic.auth-session-revoke.use-case';
import { AnalyticAuthConcurrentSessionsUseCase } from '@modules/analytic/use-cases/analytic.auth-concurrent-sessions.use-case';
import { AnalyticAuthSessionsGeoUseCase } from '@modules/analytic/use-cases/analytic.auth-sessions-geo.use-case';
import { AnalyticAuthSessionsUserAgentUseCase } from '@modules/analytic/use-cases/analytic.auth-sessions-user-agent.use-case';
import { AnalyticAuthRefreshTokenVolumeUseCase } from '@modules/analytic/use-cases/analytic.auth-refresh-token-volume.use-case';
import { AnalyticAuthLogoutRateUseCase } from '@modules/analytic/use-cases/analytic.auth-logout-rate.use-case';
import { AnalyticAuthVerificationFunnelUseCase } from '@modules/analytic/use-cases/analytic.auth-verification-funnel.use-case';
import { AnalyticAuthPasswordExpiryUseCase } from '@modules/analytic/use-cases/analytic.auth-password-expiry.use-case';
import { AnalyticAuthPasswordChangeUseCase } from '@modules/analytic/use-cases/analytic.auth-password-change.use-case';
import { AnalyticAuthForgotPasswordConversionUseCase } from '@modules/analytic/use-cases/analytic.auth-forgot-password-conversion.use-case';
import { AnalyticAuthAdminForcePasswordUseCase } from '@modules/analytic/use-cases/analytic.auth-admin-force-password.use-case';
import { AnalyticAuthTwoFactorAdoptionUseCase } from '@modules/analytic/use-cases/analytic.auth-two-factor-adoption.use-case';
import { AnalyticAuthTwoFactorAdminResetUseCase } from '@modules/analytic/use-cases/analytic.auth-two-factor-admin-reset.use-case';
import { AnalyticAuthTwoFactorVerifySuccessUseCase } from '@modules/analytic/use-cases/analytic.auth-two-factor-verify-success.use-case';
import { AnalyticAuthBackupCodeRegenerationUseCase } from '@modules/analytic/use-cases/analytic.auth-backup-code-regeneration.use-case';
import { AnalyticAuthTwoFactorAttemptUseCase } from '@modules/analytic/use-cases/analytic.auth-two-factor-attempt.use-case';
import { AnalyticDevicesRegistrationUseCase } from '@modules/analytic/use-cases/analytic.devices-registration.use-case';
import { AnalyticDevicesPlatformUseCase } from '@modules/analytic/use-cases/analytic.devices-platform.use-case';
import { AnalyticDevicesPushTokenUseCase } from '@modules/analytic/use-cases/analytic.devices-push-token.use-case';
import { AnalyticDevicesInfoRefreshUseCase } from '@modules/analytic/use-cases/analytic.devices-info-refresh.use-case';
import { AnalyticDevicesSessionRatioUseCase } from '@modules/analytic/use-cases/analytic.devices-session-ratio.use-case';
import { AnalyticDevicesPerUserUseCase } from '@modules/analytic/use-cases/analytic.devices-per-user.use-case';
import { AnalyticDevicesInactivityUseCase } from '@modules/analytic/use-cases/analytic.devices-inactivity.use-case';
import { AnalyticApiKeysLifecycleUseCase } from '@modules/analytic/use-cases/analytic.api-keys-lifecycle.use-case';
import { AnalyticApiKeysActiveExpiredUseCase } from '@modules/analytic/use-cases/analytic.api-keys-active-expired.use-case';
import { AnalyticApiKeysTypeMixUseCase } from '@modules/analytic/use-cases/analytic.api-keys-type-mix.use-case';
import { AnalyticTermPoliciesAcceptanceRateUseCase } from '@modules/analytic/use-cases/analytic.term-policies-acceptance-rate.use-case';
import { AnalyticTermPoliciesTimeToAcceptUseCase } from '@modules/analytic/use-cases/analytic.term-policies-time-to-accept.use-case';
import { AnalyticWorkspacesCreationUseCase } from '@modules/analytic/use-cases/analytic.workspaces-creation.use-case';
import { AnalyticWorkspacesVisibilityUseCase } from '@modules/analytic/use-cases/analytic.workspaces-visibility.use-case';
import { AnalyticWorkspacesInviteFunnelUseCase } from '@modules/analytic/use-cases/analytic.workspaces-invite-funnel.use-case';
import { AnalyticWorkspacesJoinOutcomesUseCase } from '@modules/analytic/use-cases/analytic.workspaces-join-outcomes.use-case';
import { AnalyticWorkspacesMembershipUseCase } from '@modules/analytic/use-cases/analytic.workspaces-membership.use-case';
import { AnalyticWorkspacesActivityVolumeUseCase } from '@modules/analytic/use-cases/analytic.workspaces-activity-volume.use-case';
import { AnalyticProjectsCreationUseCase } from '@modules/analytic/use-cases/analytic.projects-creation.use-case';
import { AnalyticProjectsMembershipUseCase } from '@modules/analytic/use-cases/analytic.projects-membership.use-case';
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
import { AnalyticRefreshSpikeSummaryUseCase } from '@modules/analytic/use-cases/analytic.refresh-spike-summary.use-case';
import { AnalyticRefreshSpikeListUseCase } from '@modules/analytic/use-cases/analytic.refresh-spike-list.use-case';
import { AnalyticBackupCodeNewDeviceSummaryUseCase } from '@modules/analytic/use-cases/analytic.backup-code-new-device-summary.use-case';
import { AnalyticBackupCodeNewDeviceListUseCase } from '@modules/analytic/use-cases/analytic.backup-code-new-device-list.use-case';
import { AnalyticApiKeyBurstSummaryUseCase } from '@modules/analytic/use-cases/analytic.api-key-burst-summary.use-case';
import { AnalyticApiKeyBurstListUseCase } from '@modules/analytic/use-cases/analytic.api-key-burst-list.use-case';
import { AnalyticRiskScoreUseCase } from '@modules/analytic/use-cases/analytic.risk-score.use-case';
import { AnalyticRiskScoresUseCase } from '@modules/analytic/use-cases/analytic.risk-scores.use-case';
import { AnalyticImpossibleTravelSummaryUseCase } from '@modules/analytic/use-cases/analytic.impossible-travel-summary.use-case';
import { AnalyticImpossibleTravelListUseCase } from '@modules/analytic/use-cases/analytic.impossible-travel-list.use-case';
import { AnalyticLoginSpikeIpSummaryUseCase } from '@modules/analytic/use-cases/analytic.login-spike-ip-summary.use-case';
import { AnalyticLoginSpikeIpListUseCase } from '@modules/analytic/use-cases/analytic.login-spike-ip-list.use-case';
import { AnalyticFailedLoginSpikeSummaryUseCase } from '@modules/analytic/use-cases/analytic.failed-login-spike-summary.use-case';
import { AnalyticFailedLoginSpikeListUseCase } from '@modules/analytic/use-cases/analytic.failed-login-spike-list.use-case';
import { AnalyticDeviceProliferationSummaryUseCase } from '@modules/analytic/use-cases/analytic.device-proliferation-summary.use-case';
import { AnalyticDeviceProliferationListUseCase } from '@modules/analytic/use-cases/analytic.device-proliferation-list.use-case';
import { AnalyticLoginTimeSummaryUseCase } from '@modules/analytic/use-cases/analytic.login-time-summary.use-case';
import { AnalyticLoginTimeListUseCase } from '@modules/analytic/use-cases/analytic.login-time-list.use-case';

@ApiTags('modules.admin.analytic')
@Controller({
    version: '1',
    path: '/analytic',
})
export class AnalyticAdminController {
    constructor(
        private readonly analyticUsersRegistrationsUseCase: AnalyticUsersRegistrationsUseCase,
        private readonly analyticUsersChurnUseCase: AnalyticUsersChurnUseCase,
        private readonly analyticUsersBlockedUseCase: AnalyticUsersBlockedUseCase,
        private readonly analyticUsersSignUpWithUseCase: AnalyticUsersSignUpWithUseCase,
        private readonly analyticUsersSignUpFromUseCase: AnalyticUsersSignUpFromUseCase,
        private readonly analyticUsersEmailVerificationUseCase: AnalyticUsersEmailVerificationUseCase,
        private readonly analyticUsersMobileVerificationUseCase: AnalyticUsersMobileVerificationUseCase,
        private readonly analyticUsersStatusDistributionUseCase: AnalyticUsersStatusDistributionUseCase,
        private readonly analyticUsersCountryDistributionUseCase: AnalyticUsersCountryDistributionUseCase,
        private readonly analyticUsersRoleDistributionUseCase: AnalyticUsersRoleDistributionUseCase,
        private readonly analyticUsersSelfDeleteUseCase: AnalyticUsersSelfDeleteUseCase,
        private readonly analyticUsersClaimUsernameUseCase: AnalyticUsersClaimUsernameUseCase,
        private readonly analyticUsersMobileChurnUseCase: AnalyticUsersMobileChurnUseCase,
        private readonly analyticAuthLoginFrequencyUseCase: AnalyticAuthLoginFrequencyUseCase,
        private readonly analyticAuthLoginMethodUseCase: AnalyticAuthLoginMethodUseCase,
        private readonly analyticAuthLoginSourceUseCase: AnalyticAuthLoginSourceUseCase,
        private readonly analyticAuthLockoutUseCase: AnalyticAuthLockoutUseCase,
        private readonly analyticAuthSessionRevokeUseCase: AnalyticAuthSessionRevokeUseCase,
        private readonly analyticAuthConcurrentSessionsUseCase: AnalyticAuthConcurrentSessionsUseCase,
        private readonly analyticAuthSessionsGeoUseCase: AnalyticAuthSessionsGeoUseCase,
        private readonly analyticAuthSessionsUserAgentUseCase: AnalyticAuthSessionsUserAgentUseCase,
        private readonly analyticAuthRefreshTokenVolumeUseCase: AnalyticAuthRefreshTokenVolumeUseCase,
        private readonly analyticAuthLogoutRateUseCase: AnalyticAuthLogoutRateUseCase,
        private readonly analyticAuthVerificationFunnelUseCase: AnalyticAuthVerificationFunnelUseCase,
        private readonly analyticAuthPasswordExpiryUseCase: AnalyticAuthPasswordExpiryUseCase,
        private readonly analyticAuthPasswordChangeUseCase: AnalyticAuthPasswordChangeUseCase,
        private readonly analyticAuthForgotPasswordConversionUseCase: AnalyticAuthForgotPasswordConversionUseCase,
        private readonly analyticAuthAdminForcePasswordUseCase: AnalyticAuthAdminForcePasswordUseCase,
        private readonly analyticAuthTwoFactorAdoptionUseCase: AnalyticAuthTwoFactorAdoptionUseCase,
        private readonly analyticAuthTwoFactorAdminResetUseCase: AnalyticAuthTwoFactorAdminResetUseCase,
        private readonly analyticAuthTwoFactorVerifySuccessUseCase: AnalyticAuthTwoFactorVerifySuccessUseCase,
        private readonly analyticAuthBackupCodeRegenerationUseCase: AnalyticAuthBackupCodeRegenerationUseCase,
        private readonly analyticAuthTwoFactorAttemptUseCase: AnalyticAuthTwoFactorAttemptUseCase,
        private readonly analyticDevicesRegistrationUseCase: AnalyticDevicesRegistrationUseCase,
        private readonly analyticDevicesPlatformUseCase: AnalyticDevicesPlatformUseCase,
        private readonly analyticDevicesPushTokenUseCase: AnalyticDevicesPushTokenUseCase,
        private readonly analyticDevicesInfoRefreshUseCase: AnalyticDevicesInfoRefreshUseCase,
        private readonly analyticDevicesSessionRatioUseCase: AnalyticDevicesSessionRatioUseCase,
        private readonly analyticDevicesPerUserUseCase: AnalyticDevicesPerUserUseCase,
        private readonly analyticDevicesInactivityUseCase: AnalyticDevicesInactivityUseCase,
        private readonly analyticApiKeysLifecycleUseCase: AnalyticApiKeysLifecycleUseCase,
        private readonly analyticApiKeysActiveExpiredUseCase: AnalyticApiKeysActiveExpiredUseCase,
        private readonly analyticApiKeysTypeMixUseCase: AnalyticApiKeysTypeMixUseCase,
        private readonly analyticTermPoliciesAcceptanceRateUseCase: AnalyticTermPoliciesAcceptanceRateUseCase,
        private readonly analyticTermPoliciesTimeToAcceptUseCase: AnalyticTermPoliciesTimeToAcceptUseCase,
        private readonly analyticWorkspacesCreationUseCase: AnalyticWorkspacesCreationUseCase,
        private readonly analyticWorkspacesVisibilityUseCase: AnalyticWorkspacesVisibilityUseCase,
        private readonly analyticWorkspacesInviteFunnelUseCase: AnalyticWorkspacesInviteFunnelUseCase,
        private readonly analyticWorkspacesJoinOutcomesUseCase: AnalyticWorkspacesJoinOutcomesUseCase,
        private readonly analyticWorkspacesMembershipUseCase: AnalyticWorkspacesMembershipUseCase,
        private readonly analyticWorkspacesActivityVolumeUseCase: AnalyticWorkspacesActivityVolumeUseCase,
        private readonly analyticProjectsCreationUseCase: AnalyticProjectsCreationUseCase,
        private readonly analyticProjectsMembershipUseCase: AnalyticProjectsMembershipUseCase,
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
        private readonly analyticRefreshSpikeSummaryUseCase: AnalyticRefreshSpikeSummaryUseCase,
        private readonly analyticRefreshSpikeListUseCase: AnalyticRefreshSpikeListUseCase,
        private readonly analyticBackupCodeNewDeviceSummaryUseCase: AnalyticBackupCodeNewDeviceSummaryUseCase,
        private readonly analyticBackupCodeNewDeviceListUseCase: AnalyticBackupCodeNewDeviceListUseCase,
        private readonly analyticApiKeyBurstSummaryUseCase: AnalyticApiKeyBurstSummaryUseCase,
        private readonly analyticApiKeyBurstListUseCase: AnalyticApiKeyBurstListUseCase,
        private readonly analyticRiskScoreUseCase: AnalyticRiskScoreUseCase,
        private readonly analyticRiskScoresUseCase: AnalyticRiskScoresUseCase,
        private readonly analyticImpossibleTravelSummaryUseCase: AnalyticImpossibleTravelSummaryUseCase,
        private readonly analyticImpossibleTravelListUseCase: AnalyticImpossibleTravelListUseCase,
        private readonly analyticLoginSpikeIpSummaryUseCase: AnalyticLoginSpikeIpSummaryUseCase,
        private readonly analyticLoginSpikeIpListUseCase: AnalyticLoginSpikeIpListUseCase,
        private readonly analyticFailedLoginSpikeSummaryUseCase: AnalyticFailedLoginSpikeSummaryUseCase,
        private readonly analyticFailedLoginSpikeListUseCase: AnalyticFailedLoginSpikeListUseCase,
        private readonly analyticDeviceProliferationSummaryUseCase: AnalyticDeviceProliferationSummaryUseCase,
        private readonly analyticDeviceProliferationListUseCase: AnalyticDeviceProliferationListUseCase,
        private readonly analyticLoginTimeSummaryUseCase: AnalyticLoginTimeSummaryUseCase,
        private readonly analyticLoginTimeListUseCase: AnalyticLoginTimeListUseCase
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/registrations')
    async usersRegistrations(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticUsersRegistrationsUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/churn')
    async usersChurn(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        return this.analyticUsersChurnUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/blocked')
    async usersBlocked(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBlockedUsers>> {
        return this.analyticUsersBlockedUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/sign-up-with')
    async usersSignUpWith(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticUsersSignUpWithUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/sign-up-from')
    async usersSignUpFrom(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticUsersSignUpFromUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/email-verification')
    async usersEmailVerification(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        return this.analyticUsersEmailVerificationUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/mobile-verification')
    async usersMobileVerification(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricRate>> {
        return this.analyticUsersMobileVerificationUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/status-distribution')
    async usersStatusDistribution(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        return this.analyticUsersStatusDistributionUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/country-distribution')
    async usersCountryDistribution(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        return this.analyticUsersCountryDistributionUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/role-distribution')
    async usersRoleDistribution(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        return this.analyticUsersRoleDistributionUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/self-delete')
    async usersSelfDelete(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticUsersSelfDeleteUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/claim-username')
    async usersClaimUsername(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticUsersClaimUsernameUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/users/mobile-churn')
    async usersMobileChurn(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMobileChurn>> {
        return this.analyticUsersMobileChurnUseCase.execute(query);
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/login-method')
    async authLoginMethod(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticAuthLoginMethodUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/login-source')
    async authLoginSource(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticAuthLoginSourceUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/lockout')
    async authLockout(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticLockoutMetrics>> {
        return this.analyticAuthLockoutUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/session-revoke')
    async authSessionRevoke(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticAuthSessionRevokeUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/concurrent-sessions')
    async authConcurrentSessions(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/sessions-geo')
    async authSessionsGeo(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/sessions-user-agent')
    async authSessionsUserAgent(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticAuthSessionsUserAgentUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/refresh-token-volume')
    async authRefreshTokenVolume(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticAuthRefreshTokenVolumeUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/logout-rate')
    async authLogoutRate(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticAuthLogoutRateUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/verification-funnel')
    async authVerificationFunnel(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticVerificationFunnels>> {
        return this.analyticAuthVerificationFunnelUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/password-expiry')
    async authPasswordExpiry(): Promise<
        IResponseReturn<IAnalyticPasswordExpiry>
    > {
        return this.analyticAuthPasswordExpiryUseCase.execute();
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/forgot-password-conversion')
    async authForgotPasswordConversion(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticForgotPasswordConversion>> {
        return this.analyticAuthForgotPasswordConversionUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/admin-force-password')
    async authAdminForcePassword(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticAuthAdminForcePasswordUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/two-factor-adoption')
    async authTwoFactorAdoption(): Promise<
        IResponseReturn<IAnalyticTwoFactorAdoption>
    > {
        return this.analyticAuthTwoFactorAdoptionUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/two-factor-admin-reset')
    async authTwoFactorAdminReset(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticAuthTwoFactorAdminResetUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/two-factor-verify-success')
    async authTwoFactorVerifySuccess(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticAuthTwoFactorVerifySuccessUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/backup-code-regeneration')
    async authBackupCodeRegeneration(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticAuthBackupCodeRegenerationUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/two-factor-attempt')
    async authTwoFactorAttempt(): Promise<
        IResponseReturn<IAnalyticTwoFactorAttemptSnapshot>
    > {
        return this.analyticAuthTwoFactorAttemptUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/devices/registration')
    async devicesRegistration(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDevicesRegistrationUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/devices/platform')
    async devicesPlatform(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticDevicesPlatformUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/devices/push-token')
    async devicesPushToken(): Promise<IResponseReturn<IAnalyticMetricRate>> {
        return this.analyticDevicesPushTokenUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/devices/info-refresh')
    async devicesInfoRefresh(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDevicesInfoRefreshUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/devices/session-ratio')
    async devicesSessionRatio(): Promise<
        IResponseReturn<IAnalyticSessionDeviceRatio>
    > {
        return this.analyticDevicesSessionRatioUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/devices/per-user')
    async devicesPerUser(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticDevicesPerUserUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/devices/inactivity')
    async devicesInactivity(): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticDevicesInactivityUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/api-keys/lifecycle')
    async apiKeysLifecycle(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticApiKeyLifecycle>> {
        return this.analyticApiKeysLifecycleUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/api-keys/active-expired')
    async apiKeysActiveExpired(): Promise<
        IResponseReturn<IAnalyticApiKeyActiveExpired>
    > {
        return this.analyticApiKeysActiveExpiredUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/api-keys/type-mix')
    async apiKeysTypeMix(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        return this.analyticApiKeysTypeMixUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/term-policies/acceptance-rate')
    async termPoliciesAcceptanceRate(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticTermPolicyAcceptanceRate>> {
        return this.analyticTermPoliciesAcceptanceRateUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/term-policies/time-to-accept')
    async termPoliciesTimeToAccept(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticTermPolicyTimeToAccept>> {
        return this.analyticTermPoliciesTimeToAcceptUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspaces/creation')
    async workspacesCreation(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticWorkspacesCreationUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspaces/visibility')
    async workspacesVisibility(): Promise<
        IResponseReturn<IAnalyticBucketsResult>
    > {
        return this.analyticWorkspacesVisibilityUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspaces/invite-funnel')
    async workspacesInviteFunnel(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        return this.analyticWorkspacesInviteFunnelUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspaces/join-outcomes')
    async workspacesJoinOutcomes(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        return this.analyticWorkspacesJoinOutcomesUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspaces/membership')
    async workspacesMembership(
        @Query({ schema: AnalyticWorkspacesMembershipListRequestSchema })
        query: AnalyticWorkspacesMembershipListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return this.analyticWorkspacesMembershipUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspaces/activity-volume')
    async workspacesActivityVolume(
        @Query({ schema: AnalyticWorkspacesActivityVolumeListRequestSchema })
        query: AnalyticWorkspacesActivityVolumeListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return this.analyticWorkspacesActivityVolumeUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/projects/creation')
    async projectsCreation(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticProjectCreation>> {
        return this.analyticProjectsCreationUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/projects/membership')
    async projectsMembership(
        @Query({ schema: AnalyticProjectsMembershipListRequestSchema })
        query: AnalyticProjectsMembershipListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        return this.analyticProjectsMembershipUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/credential-stuffing')
    async credentialStuffing(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudCredentialStuffingSummary>> {
        return this.analyticCredentialStuffingSummaryUseCase.execute(query);
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/account-takeover')
    async accountTakeover(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticAccountTakeoverSummaryUseCase.execute(query);
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/mass-registration')
    async massRegistration(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticMassRegistrationSummaryUseCase.execute(query);
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/password-reset-enumeration')
    async passwordResetEnumeration(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticPasswordResetEnumerationSummaryUseCase.execute(
            query
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/shared-fingerprint')
    async sharedFingerprint(): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticSharedFingerprintSummaryUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/shared-fingerprint/list')
    async sharedFingerprintList(
        @Query({ schema: AnalyticSharedFingerprintListRequestSchema })
        query: AnalyticSharedFingerprintListRequestDto
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/session-after-admin')
    async sessionAfterAdmin(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticSessionAfterAdminSummaryUseCase.execute(query);
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/forgot-password-token-abuse')
    async forgotPasswordTokenAbuse(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticForgotPasswordTokenAbuseSummaryUseCase.execute(
            query
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/forgot-password-token-abuse/list')
    async forgotPasswordTokenAbuseList(
        @Query({ schema: AnalyticForgotPasswordAbuseListRequestSchema })
        query: AnalyticForgotPasswordAbuseListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticForgotPasswordAbuse>> {
        return this.analyticForgotPasswordTokenAbuseListUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/refresh-spike')
    async refreshSpike(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticRefreshSpikeSummaryUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/refresh-spike/list')
    async refreshSpikeList(
        @Query({ schema: AnalyticRefreshSpikeListRequestSchema })
        query: AnalyticRefreshSpikeListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticRefreshSpike>> {
        return this.analyticRefreshSpikeListUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/backup-code-new-device')
    async backupCodeNewDevice(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticBackupCodeNewDeviceSummaryUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/backup-code-new-device/list')
    async backupCodeNewDeviceList(
        @Query({ schema: AnalyticBackupCodeNewDeviceListRequestSchema })
        query: AnalyticBackupCodeNewDeviceListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticBackupCodeNewDevice>> {
        return this.analyticBackupCodeNewDeviceListUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/api-key-burst')
    async apiKeyBurst(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        return this.analyticApiKeyBurstSummaryUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/api-key-burst/list')
    async apiKeyBurstList(
        @Query({ schema: AnalyticApiKeyBurstListRequestSchema })
        query: AnalyticApiKeyBurstListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticApiKeyBurst>> {
        return this.analyticApiKeyBurstListUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/risk-score/:userId')
    async riskScore(
        @Param('userId', { schema: RequestMongoIdSchema })
        userId: string
    ): Promise<IResponseReturn<IAnalyticFraudRiskScore>> {
        return this.analyticRiskScoreUseCase.execute(userId);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/fraud/risk-scores')
    async riskScores(
        @Query({ schema: AnalyticFraudRiskScoresListRequestSchema })
        query: AnalyticFraudRiskScoresListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticFraudRiskScore>> {
        return this.analyticRiskScoresUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/impossible-travel')
    async impossibleTravel(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticAnomalyImpossibleTravelSummary>> {
        return this.analyticImpossibleTravelSummaryUseCase.execute(query);
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/login-spike-ip')
    async loginSpikeIp(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticAnomalyLoginSpikeIpSummary>> {
        return this.analyticLoginSpikeIpSummaryUseCase.execute(query);
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/failed-login-spike')
    async failedLoginSpike(): Promise<
        IResponseReturn<IAnalyticAnomalyFailedLoginSpikeSummary>
    > {
        return this.analyticFailedLoginSpikeSummaryUseCase.execute();
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/device-proliferation')
    async deviceProliferation(): Promise<
        IResponseReturn<IAnalyticAnomalyDeviceProliferationSummary>
    > {
        return this.analyticDeviceProliferationSummaryUseCase.execute();
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/device-proliferation/list')
    async deviceProliferationList(
        @Query({ schema: AnalyticDeviceProliferationListRequestSchema })
        query: AnalyticDeviceProliferationListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticDeviceProliferation>> {
        return this.analyticDeviceProliferationListUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/login-time')
    async loginTime(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticAnomalySummary>> {
        return this.analyticLoginTimeSummaryUseCase.execute(query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/anomaly/login-time/list')
    async loginTimeList(
        @Query({ schema: AnalyticLoginTimeAnomalyListRequestSchema })
        query: AnalyticLoginTimeAnomalyListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticLoginTimeAnomaly>> {
        return this.analyticLoginTimeListUseCase.execute(query);
    }
}

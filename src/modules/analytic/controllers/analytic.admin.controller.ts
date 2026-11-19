import { AnalyticWorkspacesActivityVolumeListRequestSchema } from '@modules/analytic/dtos/request/analytic.workspaces-activity-volume-list.request.dto';
import type { AnalyticWorkspacesActivityVolumeListRequestDto } from '@modules/analytic/dtos/request/analytic.workspaces-activity-volume-list.request.dto';
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
import { RequestThrottle } from '@common/request/decorators/request.decorator';
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
import {
    AnalyticFraudRiskScoreResponseSchema,
    AnalyticFraudRiskScoreUserResponseSchema,
} from '@modules/analytic/dtos/response/analytic.fraud-risk-score.response.dto';
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
import { AnalyticUsersRegistrationsUseCase } from '@modules/analytic/use-cases/analytic.users-registrations.use-case';
import { AnalyticUsersChurnUseCase } from '@modules/analytic/use-cases/analytic.users-churn.use-case';
import { AnalyticUsersBlockedUseCase } from '@modules/analytic/use-cases/analytic.users-blocked.use-case';
import { AnalyticUsersSignUpWithUseCase } from '@modules/analytic/use-cases/analytic.users-sign-up-with.use-case';
import { AnalyticUsersEmailVerificationUseCase } from '@modules/analytic/use-cases/analytic.users-email-verification.use-case';
import { AnalyticUsersStatusDistributionUseCase } from '@modules/analytic/use-cases/analytic.users-status-distribution.use-case';
import { AnalyticUsersCountryDistributionUseCase } from '@modules/analytic/use-cases/analytic.users-country-distribution.use-case';
import { AnalyticUsersActiveUseCase } from '@modules/analytic/use-cases/analytic.users-active.use-case';
import { AnalyticUsersRoleDistributionUseCase } from '@modules/analytic/use-cases/analytic.users-role-distribution.use-case';
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
import { AnalyticDevicesPlatformUseCase } from '@modules/analytic/use-cases/analytic.devices-platform.use-case';
import { AnalyticDevicesPushTokenUseCase } from '@modules/analytic/use-cases/analytic.devices-push-token.use-case';
import { AnalyticDevicesPerUserUseCase } from '@modules/analytic/use-cases/analytic.devices-per-user.use-case';
import { AnalyticDevicesInactivityUseCase } from '@modules/analytic/use-cases/analytic.devices-inactivity.use-case';
import { AnalyticApiKeysActiveExpiredUseCase } from '@modules/analytic/use-cases/analytic.api-keys-active-expired.use-case';
import { AnalyticTermPoliciesAcceptanceRateUseCase } from '@modules/analytic/use-cases/analytic.term-policies-acceptance-rate.use-case';
import { AnalyticWorkspacesCreationUseCase } from '@modules/analytic/use-cases/analytic.workspaces-creation.use-case';
import { AnalyticWorkspacesInviteFunnelUseCase } from '@modules/analytic/use-cases/analytic.workspaces-invite-funnel.use-case';
import { AnalyticWorkspacesJoinOutcomesUseCase } from '@modules/analytic/use-cases/analytic.workspaces-join-outcomes.use-case';
import { AnalyticWorkspacesMembershipListUseCase } from '@modules/analytic/use-cases/analytic.workspaces-membership-list.use-case';
import { AnalyticWorkspacesActivityVolumeListUseCase } from '@modules/analytic/use-cases/analytic.workspaces-activity-volume-list.use-case';
import { AnalyticProjectsCreationUseCase } from '@modules/analytic/use-cases/analytic.projects-creation.use-case';
import { AnalyticNotificationsDeliveryUseCase } from '@modules/analytic/use-cases/analytic.notifications-delivery.use-case';
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
        private readonly analyticUsersRegistrationsUseCase: AnalyticUsersRegistrationsUseCase,
        private readonly analyticUsersChurnUseCase: AnalyticUsersChurnUseCase,
        private readonly analyticUsersBlockedUseCase: AnalyticUsersBlockedUseCase,
        private readonly analyticUsersSignUpWithUseCase: AnalyticUsersSignUpWithUseCase,
        private readonly analyticUsersEmailVerificationUseCase: AnalyticUsersEmailVerificationUseCase,
        private readonly analyticUsersStatusDistributionUseCase: AnalyticUsersStatusDistributionUseCase,
        private readonly analyticUsersCountryDistributionUseCase: AnalyticUsersCountryDistributionUseCase,
        private readonly analyticUsersRoleDistributionUseCase: AnalyticUsersRoleDistributionUseCase,
        private readonly analyticUsersActiveUseCase: AnalyticUsersActiveUseCase,
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
        private readonly analyticDevicesPlatformUseCase: AnalyticDevicesPlatformUseCase,
        private readonly analyticDevicesPushTokenUseCase: AnalyticDevicesPushTokenUseCase,
        private readonly analyticDevicesPerUserUseCase: AnalyticDevicesPerUserUseCase,
        private readonly analyticDevicesInactivityUseCase: AnalyticDevicesInactivityUseCase,
        private readonly analyticApiKeysActiveExpiredUseCase: AnalyticApiKeysActiveExpiredUseCase,
        private readonly analyticTermPoliciesAcceptanceRateUseCase: AnalyticTermPoliciesAcceptanceRateUseCase,
        private readonly analyticWorkspacesCreationUseCase: AnalyticWorkspacesCreationUseCase,
        private readonly analyticWorkspacesInviteFunnelUseCase: AnalyticWorkspacesInviteFunnelUseCase,
        private readonly analyticWorkspacesJoinOutcomesUseCase: AnalyticWorkspacesJoinOutcomesUseCase,
        private readonly analyticWorkspacesMembershipListUseCase: AnalyticWorkspacesMembershipListUseCase,
        private readonly analyticWorkspacesActivityVolumeListUseCase: AnalyticWorkspacesActivityVolumeListUseCase,
        private readonly analyticProjectsCreationUseCase: AnalyticProjectsCreationUseCase,
        private readonly analyticNotificationsDeliveryUseCase: AnalyticNotificationsDeliveryUseCase,
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

    @Doc({
        summary: 'admin get daily, weekly, and monthly active users',
        description:
            'Counts live users whose last sign-in or token refresh falls within the last day, 7 days, and 30 days.',
    })
    @Response('analytic.usersActive', {
        schema: AnalyticActiveUsersResponseSchema,
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
    @Get('/users/active')
    async usersActive(): Promise<IResponseReturn<IAnalyticActiveUsers>> {
        return this.analyticUsersActiveUseCase.execute();
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/auth/mfa-adoption')
    async authMfaAdoption(): Promise<IResponseReturn<IAnalyticMfaAdoption>> {
        return this.analyticAuthMfaAdoptionUseCase.execute();
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

    @Doc({ summary: 'admin get device per user distribution' })
    @Response('analytic.devicesPerUser', {
        schema: AnalyticSnapshotBucketsResponseSchema,
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
    async devicesPerUser(): Promise<
        IResponseReturn<IAnalyticSnapshotBucketsResult>
    > {
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

    @Doc({
        summary: 'admin get member counts per workspace',
        description:
            'orderBy presets: highestValue (member count descending, default), key (workspace id ascending).',
    })
    @ResponsePagination('analytic.workspacesMembershipList', {
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
    @Get('/workspaces/membership/list')
    async workspacesMembershipList(
        @Query({ schema: AnalyticSnapshotListRequestSchema })
        query: AnalyticSnapshotListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return this.analyticWorkspacesMembershipListUseCase.execute(query);
    }

    @Doc({
        summary: 'admin get activity volume per workspace by date range',
        description: 'orderBy presets: mostCount (count descending, default).',
    })
    @ResponsePagination('analytic.workspacesActivityVolumeList', {
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
    @Get('/workspaces/activity-volume/list')
    async workspacesActivityVolumeList(
        @Query({ schema: AnalyticWorkspacesActivityVolumeListRequestSchema })
        query: AnalyticWorkspacesActivityVolumeListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return this.analyticWorkspacesActivityVolumeListUseCase.execute(query);
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

    @Doc({
        summary: 'admin get notification delivery counts per channel',
        description:
            'Counts delivery rows created in the date range per channel. Sent means sentAt is set; failed means processedAt is set and sentAt is null; pending means both are null. A delivery being sent or retried counts as failed until sentAt lands, because the email and sms flows stamp processedAt before the send.',
    })
    @Response('analytic.notificationsDelivery', {
        schema: AnalyticNotificationDeliveryResponseSchema,
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
    @Get('/notifications/delivery')
    async notificationsDelivery(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticNotificationDeliveryResult>> {
        return this.analyticNotificationsDeliveryUseCase.execute(query);
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
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
    @RequestThrottle({ user: true })
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

import { AnalyticModule } from '@modules/analytic/analytic.module';
import { AnalyticImpossibleTravelSummaryUseCase } from '@modules/analytic/use-cases/analytic.impossible-travel-summary.use-case';
import { AnalyticImpossibleTravelListUseCase } from '@modules/analytic/use-cases/analytic.impossible-travel-list.use-case';
import { AnalyticLoginSpikeIpSummaryUseCase } from '@modules/analytic/use-cases/analytic.login-spike-ip-summary.use-case';
import { AnalyticLoginSpikeIpListUseCase } from '@modules/analytic/use-cases/analytic.login-spike-ip-list.use-case';
import { AnalyticFailedLoginSpikeSummaryUseCase } from '@modules/analytic/use-cases/analytic.failed-login-spike-summary.use-case';
import { AnalyticFailedLoginSpikeListUseCase } from '@modules/analytic/use-cases/analytic.failed-login-spike-list.use-case';
import { AnalyticDeviceProliferationSummaryUseCase } from '@modules/analytic/use-cases/analytic.device-proliferation-summary.use-case';
import { AnalyticDeviceProliferationListUseCase } from '@modules/analytic/use-cases/analytic.device-proliferation-list.use-case';
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
import { AnalyticSummaryUseCase } from '@modules/analytic/use-cases/analytic.summary.use-case';
import { AnalyticInviteFunnelUseCase } from '@modules/analytic/use-cases/analytic.invite-funnel.use-case';
import { AnalyticJoinOutcomesUseCase } from '@modules/analytic/use-cases/analytic.join-outcomes.use-case';
import { AnalyticMemberRolesUseCase } from '@modules/analytic/use-cases/analytic.member-roles.use-case';
import { AnalyticProcessRefreshSnapshotUseCase } from '@modules/analytic/use-cases/analytic.process-refresh-snapshot.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        AnalyticImpossibleTravelSummaryUseCase,
        AnalyticImpossibleTravelListUseCase,
        AnalyticLoginSpikeIpSummaryUseCase,
        AnalyticLoginSpikeIpListUseCase,
        AnalyticFailedLoginSpikeSummaryUseCase,
        AnalyticFailedLoginSpikeListUseCase,
        AnalyticDeviceProliferationSummaryUseCase,
        AnalyticDeviceProliferationListUseCase,
        AnalyticUserRegistrationsUseCase,
        AnalyticUserChurnUseCase,
        AnalyticUserBlockedUseCase,
        AnalyticUserSignUpWithUseCase,
        AnalyticUserEmailVerificationUseCase,
        AnalyticUserStatusDistributionUseCase,
        AnalyticUserCountryDistributionUseCase,
        AnalyticUserRoleDistributionUseCase,
        AnalyticUserActiveUseCase,
        AnalyticAuthLoginFrequencyUseCase,
        AnalyticAuthLoginMethodUseCase,
        AnalyticAuthLockoutUseCase,
        AnalyticAuthConcurrentSessionsUseCase,
        AnalyticAuthSessionsGeoUseCase,
        AnalyticAuthSessionsUserAgentUseCase,
        AnalyticAuthVerificationFunnelUseCase,
        AnalyticAuthPasswordChangeUseCase,
        AnalyticAuthForgotPasswordConversionUseCase,
        AnalyticAuthMfaAdoptionUseCase,
        AnalyticDevicePlatformUseCase,
        AnalyticDevicePushTokenUseCase,
        AnalyticDevicePerUserUseCase,
        AnalyticDeviceInactivityUseCase,
        AnalyticApiKeyActiveExpiredUseCase,
        AnalyticTermPolicyAcceptanceRateUseCase,
        AnalyticWorkspaceCreationUseCase,
        AnalyticWorkspaceInviteFunnelUseCase,
        AnalyticWorkspaceJoinOutcomesUseCase,
        AnalyticWorkspaceMembershipListUseCase,
        AnalyticWorkspaceActivityVolumeListUseCase,
        AnalyticProjectCreationUseCase,
        AnalyticNotificationDeliveryUseCase,
        AnalyticCredentialStuffingSummaryUseCase,
        AnalyticCredentialStuffingListUseCase,
        AnalyticAccountTakeoverSummaryUseCase,
        AnalyticAccountTakeoverListUseCase,
        AnalyticMassRegistrationSummaryUseCase,
        AnalyticMassRegistrationListUseCase,
        AnalyticPasswordResetEnumerationSummaryUseCase,
        AnalyticPasswordResetEnumerationListUseCase,
        AnalyticSharedFingerprintSummaryUseCase,
        AnalyticSharedFingerprintListUseCase,
        AnalyticSessionAfterAdminSummaryUseCase,
        AnalyticSessionAfterAdminListUseCase,
        AnalyticForgotPasswordTokenAbuseSummaryUseCase,
        AnalyticForgotPasswordTokenAbuseListUseCase,
        AnalyticRiskScoreUseCase,
        AnalyticRiskScoreListUseCase,
        AnalyticSummaryUseCase,
        AnalyticInviteFunnelUseCase,
        AnalyticJoinOutcomesUseCase,
        AnalyticMemberRolesUseCase,
        AnalyticProcessRefreshSnapshotUseCase,
    ],
    exports: [
        AnalyticImpossibleTravelSummaryUseCase,
        AnalyticImpossibleTravelListUseCase,
        AnalyticLoginSpikeIpSummaryUseCase,
        AnalyticLoginSpikeIpListUseCase,
        AnalyticFailedLoginSpikeSummaryUseCase,
        AnalyticFailedLoginSpikeListUseCase,
        AnalyticDeviceProliferationSummaryUseCase,
        AnalyticDeviceProliferationListUseCase,
        AnalyticUserRegistrationsUseCase,
        AnalyticUserChurnUseCase,
        AnalyticUserBlockedUseCase,
        AnalyticUserSignUpWithUseCase,
        AnalyticUserEmailVerificationUseCase,
        AnalyticUserStatusDistributionUseCase,
        AnalyticUserCountryDistributionUseCase,
        AnalyticUserRoleDistributionUseCase,
        AnalyticUserActiveUseCase,
        AnalyticAuthLoginFrequencyUseCase,
        AnalyticAuthLoginMethodUseCase,
        AnalyticAuthLockoutUseCase,
        AnalyticAuthConcurrentSessionsUseCase,
        AnalyticAuthSessionsGeoUseCase,
        AnalyticAuthSessionsUserAgentUseCase,
        AnalyticAuthVerificationFunnelUseCase,
        AnalyticAuthPasswordChangeUseCase,
        AnalyticAuthForgotPasswordConversionUseCase,
        AnalyticAuthMfaAdoptionUseCase,
        AnalyticDevicePlatformUseCase,
        AnalyticDevicePushTokenUseCase,
        AnalyticDevicePerUserUseCase,
        AnalyticDeviceInactivityUseCase,
        AnalyticApiKeyActiveExpiredUseCase,
        AnalyticTermPolicyAcceptanceRateUseCase,
        AnalyticWorkspaceCreationUseCase,
        AnalyticWorkspaceInviteFunnelUseCase,
        AnalyticWorkspaceJoinOutcomesUseCase,
        AnalyticWorkspaceMembershipListUseCase,
        AnalyticWorkspaceActivityVolumeListUseCase,
        AnalyticProjectCreationUseCase,
        AnalyticNotificationDeliveryUseCase,
        AnalyticCredentialStuffingSummaryUseCase,
        AnalyticCredentialStuffingListUseCase,
        AnalyticAccountTakeoverSummaryUseCase,
        AnalyticAccountTakeoverListUseCase,
        AnalyticMassRegistrationSummaryUseCase,
        AnalyticMassRegistrationListUseCase,
        AnalyticPasswordResetEnumerationSummaryUseCase,
        AnalyticPasswordResetEnumerationListUseCase,
        AnalyticSharedFingerprintSummaryUseCase,
        AnalyticSharedFingerprintListUseCase,
        AnalyticSessionAfterAdminSummaryUseCase,
        AnalyticSessionAfterAdminListUseCase,
        AnalyticForgotPasswordTokenAbuseSummaryUseCase,
        AnalyticForgotPasswordTokenAbuseListUseCase,
        AnalyticRiskScoreUseCase,
        AnalyticRiskScoreListUseCase,
        AnalyticSummaryUseCase,
        AnalyticInviteFunnelUseCase,
        AnalyticJoinOutcomesUseCase,
        AnalyticMemberRolesUseCase,
        AnalyticProcessRefreshSnapshotUseCase,
    ],
    imports: [AnalyticModule],
})
export class AnalyticUseCaseModule {}

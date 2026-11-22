import { AnalyticModule } from '@modules/analytic/analytic.module';
import { AnalyticAnomalyImpossibleTravelUseCase } from '@modules/analytic/use-cases/analytic.anomaly-impossible-travel.use-case';
import { AnalyticAnomalyImpossibleTravelListUseCase } from '@modules/analytic/use-cases/analytic.anomaly-impossible-travel-list.use-case';
import { AnalyticAnomalyLoginSpikeIpUseCase } from '@modules/analytic/use-cases/analytic.anomaly-login-spike-ip.use-case';
import { AnalyticAnomalyLoginSpikeIpListUseCase } from '@modules/analytic/use-cases/analytic.anomaly-login-spike-ip-list.use-case';
import { AnalyticAnomalyFailedLoginSpikeUseCase } from '@modules/analytic/use-cases/analytic.anomaly-failed-login-spike.use-case';
import { AnalyticAnomalyFailedLoginSpikeListUseCase } from '@modules/analytic/use-cases/analytic.anomaly-failed-login-spike-list.use-case';
import { AnalyticAnomalyDeviceProliferationUseCase } from '@modules/analytic/use-cases/analytic.anomaly-device-proliferation.use-case';
import { AnalyticAnomalyDeviceProliferationListUseCase } from '@modules/analytic/use-cases/analytic.anomaly-device-proliferation-list.use-case';
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
import { AnalyticFraudCredentialStuffingUseCase } from '@modules/analytic/use-cases/analytic.fraud-credential-stuffing.use-case';
import { AnalyticFraudCredentialStuffingListUseCase } from '@modules/analytic/use-cases/analytic.fraud-credential-stuffing-list.use-case';
import { AnalyticFraudAccountTakeoverUseCase } from '@modules/analytic/use-cases/analytic.fraud-account-takeover.use-case';
import { AnalyticFraudAccountTakeoverListUseCase } from '@modules/analytic/use-cases/analytic.fraud-account-takeover-list.use-case';
import { AnalyticFraudMassRegistrationUseCase } from '@modules/analytic/use-cases/analytic.fraud-mass-registration.use-case';
import { AnalyticFraudMassRegistrationListUseCase } from '@modules/analytic/use-cases/analytic.fraud-mass-registration-list.use-case';
import { AnalyticFraudPasswordResetEnumerationUseCase } from '@modules/analytic/use-cases/analytic.fraud-password-reset-enumeration.use-case';
import { AnalyticFraudPasswordResetEnumerationListUseCase } from '@modules/analytic/use-cases/analytic.fraud-password-reset-enumeration-list.use-case';
import { AnalyticFraudSharedFingerprintUseCase } from '@modules/analytic/use-cases/analytic.fraud-shared-fingerprint.use-case';
import { AnalyticFraudSharedFingerprintListUseCase } from '@modules/analytic/use-cases/analytic.fraud-shared-fingerprint-list.use-case';
import { AnalyticFraudSessionAfterAdminUseCase } from '@modules/analytic/use-cases/analytic.fraud-session-after-admin.use-case';
import { AnalyticFraudSessionAfterAdminListUseCase } from '@modules/analytic/use-cases/analytic.fraud-session-after-admin-list.use-case';
import { AnalyticFraudForgotPasswordTokenAbuseUseCase } from '@modules/analytic/use-cases/analytic.fraud-forgot-password-token-abuse.use-case';
import { AnalyticFraudForgotPasswordTokenAbuseListUseCase } from '@modules/analytic/use-cases/analytic.fraud-forgot-password-token-abuse-list.use-case';
import { AnalyticFraudRiskScoreUseCase } from '@modules/analytic/use-cases/analytic.fraud-risk-score.use-case';
import { AnalyticFraudRiskScoreListUseCase } from '@modules/analytic/use-cases/analytic.fraud-risk-score-list.use-case';
import { AnalyticSummaryUseCase } from '@modules/analytic/use-cases/analytic.summary.use-case';
import { AnalyticInviteFunnelUseCase } from '@modules/analytic/use-cases/analytic.invite-funnel.use-case';
import { AnalyticJoinOutcomesUseCase } from '@modules/analytic/use-cases/analytic.join-outcomes.use-case';
import { AnalyticMemberRolesUseCase } from '@modules/analytic/use-cases/analytic.member-roles.use-case';
import { AnalyticProcessRefreshSnapshotUseCase } from '@modules/analytic/use-cases/analytic.process-refresh-snapshot.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        AnalyticAnomalyImpossibleTravelUseCase,
        AnalyticAnomalyImpossibleTravelListUseCase,
        AnalyticAnomalyLoginSpikeIpUseCase,
        AnalyticAnomalyLoginSpikeIpListUseCase,
        AnalyticAnomalyFailedLoginSpikeUseCase,
        AnalyticAnomalyFailedLoginSpikeListUseCase,
        AnalyticAnomalyDeviceProliferationUseCase,
        AnalyticAnomalyDeviceProliferationListUseCase,
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
        AnalyticFraudCredentialStuffingUseCase,
        AnalyticFraudCredentialStuffingListUseCase,
        AnalyticFraudAccountTakeoverUseCase,
        AnalyticFraudAccountTakeoverListUseCase,
        AnalyticFraudMassRegistrationUseCase,
        AnalyticFraudMassRegistrationListUseCase,
        AnalyticFraudPasswordResetEnumerationUseCase,
        AnalyticFraudPasswordResetEnumerationListUseCase,
        AnalyticFraudSharedFingerprintUseCase,
        AnalyticFraudSharedFingerprintListUseCase,
        AnalyticFraudSessionAfterAdminUseCase,
        AnalyticFraudSessionAfterAdminListUseCase,
        AnalyticFraudForgotPasswordTokenAbuseUseCase,
        AnalyticFraudForgotPasswordTokenAbuseListUseCase,
        AnalyticFraudRiskScoreUseCase,
        AnalyticFraudRiskScoreListUseCase,
        AnalyticSummaryUseCase,
        AnalyticInviteFunnelUseCase,
        AnalyticJoinOutcomesUseCase,
        AnalyticMemberRolesUseCase,
        AnalyticProcessRefreshSnapshotUseCase,
    ],
    exports: [
        AnalyticAnomalyImpossibleTravelUseCase,
        AnalyticAnomalyImpossibleTravelListUseCase,
        AnalyticAnomalyLoginSpikeIpUseCase,
        AnalyticAnomalyLoginSpikeIpListUseCase,
        AnalyticAnomalyFailedLoginSpikeUseCase,
        AnalyticAnomalyFailedLoginSpikeListUseCase,
        AnalyticAnomalyDeviceProliferationUseCase,
        AnalyticAnomalyDeviceProliferationListUseCase,
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
        AnalyticFraudCredentialStuffingUseCase,
        AnalyticFraudCredentialStuffingListUseCase,
        AnalyticFraudAccountTakeoverUseCase,
        AnalyticFraudAccountTakeoverListUseCase,
        AnalyticFraudMassRegistrationUseCase,
        AnalyticFraudMassRegistrationListUseCase,
        AnalyticFraudPasswordResetEnumerationUseCase,
        AnalyticFraudPasswordResetEnumerationListUseCase,
        AnalyticFraudSharedFingerprintUseCase,
        AnalyticFraudSharedFingerprintListUseCase,
        AnalyticFraudSessionAfterAdminUseCase,
        AnalyticFraudSessionAfterAdminListUseCase,
        AnalyticFraudForgotPasswordTokenAbuseUseCase,
        AnalyticFraudForgotPasswordTokenAbuseListUseCase,
        AnalyticFraudRiskScoreUseCase,
        AnalyticFraudRiskScoreListUseCase,
        AnalyticSummaryUseCase,
        AnalyticInviteFunnelUseCase,
        AnalyticJoinOutcomesUseCase,
        AnalyticMemberRolesUseCase,
        AnalyticProcessRefreshSnapshotUseCase,
    ],
    imports: [AnalyticModule],
})
export class AnalyticUseCaseModule {}

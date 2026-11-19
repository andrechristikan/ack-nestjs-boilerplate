import { AnalyticModule } from '@modules/analytic/analytic.module';
import { AnalyticImpossibleTravelSummaryUseCase } from '@modules/analytic/use-cases/analytic.impossible-travel-summary.use-case';
import { AnalyticImpossibleTravelListUseCase } from '@modules/analytic/use-cases/analytic.impossible-travel-list.use-case';
import { AnalyticLoginSpikeIpSummaryUseCase } from '@modules/analytic/use-cases/analytic.login-spike-ip-summary.use-case';
import { AnalyticLoginSpikeIpListUseCase } from '@modules/analytic/use-cases/analytic.login-spike-ip-list.use-case';
import { AnalyticFailedLoginSpikeSummaryUseCase } from '@modules/analytic/use-cases/analytic.failed-login-spike-summary.use-case';
import { AnalyticFailedLoginSpikeListUseCase } from '@modules/analytic/use-cases/analytic.failed-login-spike-list.use-case';
import { AnalyticDeviceProliferationSummaryUseCase } from '@modules/analytic/use-cases/analytic.device-proliferation-summary.use-case';
import { AnalyticDeviceProliferationListUseCase } from '@modules/analytic/use-cases/analytic.device-proliferation-list.use-case';
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
        AnalyticUsersRegistrationsUseCase,
        AnalyticUsersChurnUseCase,
        AnalyticUsersBlockedUseCase,
        AnalyticUsersSignUpWithUseCase,
        AnalyticUsersEmailVerificationUseCase,
        AnalyticUsersStatusDistributionUseCase,
        AnalyticUsersCountryDistributionUseCase,
        AnalyticUsersRoleDistributionUseCase,
        AnalyticUsersActiveUseCase,
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
        AnalyticDevicesPlatformUseCase,
        AnalyticDevicesPushTokenUseCase,
        AnalyticDevicesPerUserUseCase,
        AnalyticDevicesInactivityUseCase,
        AnalyticApiKeysActiveExpiredUseCase,
        AnalyticTermPoliciesAcceptanceRateUseCase,
        AnalyticWorkspacesCreationUseCase,
        AnalyticWorkspacesInviteFunnelUseCase,
        AnalyticWorkspacesJoinOutcomesUseCase,
        AnalyticWorkspacesMembershipListUseCase,
        AnalyticWorkspacesActivityVolumeListUseCase,
        AnalyticProjectsCreationUseCase,
        AnalyticNotificationsDeliveryUseCase,
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
        AnalyticUsersRegistrationsUseCase,
        AnalyticUsersChurnUseCase,
        AnalyticUsersBlockedUseCase,
        AnalyticUsersSignUpWithUseCase,
        AnalyticUsersEmailVerificationUseCase,
        AnalyticUsersStatusDistributionUseCase,
        AnalyticUsersCountryDistributionUseCase,
        AnalyticUsersRoleDistributionUseCase,
        AnalyticUsersActiveUseCase,
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
        AnalyticDevicesPlatformUseCase,
        AnalyticDevicesPushTokenUseCase,
        AnalyticDevicesPerUserUseCase,
        AnalyticDevicesInactivityUseCase,
        AnalyticApiKeysActiveExpiredUseCase,
        AnalyticTermPoliciesAcceptanceRateUseCase,
        AnalyticWorkspacesCreationUseCase,
        AnalyticWorkspacesInviteFunnelUseCase,
        AnalyticWorkspacesJoinOutcomesUseCase,
        AnalyticWorkspacesMembershipListUseCase,
        AnalyticWorkspacesActivityVolumeListUseCase,
        AnalyticProjectsCreationUseCase,
        AnalyticNotificationsDeliveryUseCase,
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

import { AnalyticModule } from '@modules/analytic/analytic.module';
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
import { AnalyticSummaryUseCase } from '@modules/analytic/use-cases/analytic.summary.use-case';
import { AnalyticInviteFunnelUseCase } from '@modules/analytic/use-cases/analytic.invite-funnel.use-case';
import { AnalyticJoinOutcomesUseCase } from '@modules/analytic/use-cases/analytic.join-outcomes.use-case';
import { AnalyticMemberRolesUseCase } from '@modules/analytic/use-cases/analytic.member-roles.use-case';
import { AnalyticActivityUseCase } from '@modules/analytic/use-cases/analytic.activity.use-case';
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
        AnalyticLoginTimeSummaryUseCase,
        AnalyticLoginTimeListUseCase,
        AnalyticUsersRegistrationsUseCase,
        AnalyticUsersChurnUseCase,
        AnalyticUsersBlockedUseCase,
        AnalyticUsersSignUpWithUseCase,
        AnalyticUsersSignUpFromUseCase,
        AnalyticUsersEmailVerificationUseCase,
        AnalyticUsersMobileVerificationUseCase,
        AnalyticUsersStatusDistributionUseCase,
        AnalyticUsersCountryDistributionUseCase,
        AnalyticUsersRoleDistributionUseCase,
        AnalyticUsersSelfDeleteUseCase,
        AnalyticUsersClaimUsernameUseCase,
        AnalyticUsersMobileChurnUseCase,
        AnalyticAuthLoginFrequencyUseCase,
        AnalyticAuthLoginMethodUseCase,
        AnalyticAuthLoginSourceUseCase,
        AnalyticAuthLockoutUseCase,
        AnalyticAuthSessionRevokeUseCase,
        AnalyticAuthConcurrentSessionsUseCase,
        AnalyticAuthSessionsGeoUseCase,
        AnalyticAuthSessionsUserAgentUseCase,
        AnalyticAuthRefreshTokenVolumeUseCase,
        AnalyticAuthLogoutRateUseCase,
        AnalyticAuthVerificationFunnelUseCase,
        AnalyticAuthPasswordExpiryUseCase,
        AnalyticAuthPasswordChangeUseCase,
        AnalyticAuthForgotPasswordConversionUseCase,
        AnalyticAuthAdminForcePasswordUseCase,
        AnalyticAuthTwoFactorAdoptionUseCase,
        AnalyticAuthTwoFactorAdminResetUseCase,
        AnalyticAuthTwoFactorVerifySuccessUseCase,
        AnalyticAuthBackupCodeRegenerationUseCase,
        AnalyticAuthTwoFactorAttemptUseCase,
        AnalyticDevicesRegistrationUseCase,
        AnalyticDevicesPlatformUseCase,
        AnalyticDevicesPushTokenUseCase,
        AnalyticDevicesInfoRefreshUseCase,
        AnalyticDevicesSessionRatioUseCase,
        AnalyticDevicesPerUserUseCase,
        AnalyticDevicesInactivityUseCase,
        AnalyticApiKeysLifecycleUseCase,
        AnalyticApiKeysActiveExpiredUseCase,
        AnalyticApiKeysTypeMixUseCase,
        AnalyticTermPoliciesAcceptanceRateUseCase,
        AnalyticTermPoliciesTimeToAcceptUseCase,
        AnalyticWorkspacesCreationUseCase,
        AnalyticWorkspacesVisibilityUseCase,
        AnalyticWorkspacesInviteFunnelUseCase,
        AnalyticWorkspacesJoinOutcomesUseCase,
        AnalyticWorkspacesMembershipUseCase,
        AnalyticWorkspacesActivityVolumeUseCase,
        AnalyticProjectsCreationUseCase,
        AnalyticProjectsMembershipUseCase,
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
        AnalyticRefreshSpikeSummaryUseCase,
        AnalyticRefreshSpikeListUseCase,
        AnalyticBackupCodeNewDeviceSummaryUseCase,
        AnalyticBackupCodeNewDeviceListUseCase,
        AnalyticApiKeyBurstSummaryUseCase,
        AnalyticApiKeyBurstListUseCase,
        AnalyticRiskScoreUseCase,
        AnalyticRiskScoresUseCase,
        AnalyticSummaryUseCase,
        AnalyticInviteFunnelUseCase,
        AnalyticJoinOutcomesUseCase,
        AnalyticMemberRolesUseCase,
        AnalyticActivityUseCase,
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
        AnalyticLoginTimeSummaryUseCase,
        AnalyticLoginTimeListUseCase,
        AnalyticUsersRegistrationsUseCase,
        AnalyticUsersChurnUseCase,
        AnalyticUsersBlockedUseCase,
        AnalyticUsersSignUpWithUseCase,
        AnalyticUsersSignUpFromUseCase,
        AnalyticUsersEmailVerificationUseCase,
        AnalyticUsersMobileVerificationUseCase,
        AnalyticUsersStatusDistributionUseCase,
        AnalyticUsersCountryDistributionUseCase,
        AnalyticUsersRoleDistributionUseCase,
        AnalyticUsersSelfDeleteUseCase,
        AnalyticUsersClaimUsernameUseCase,
        AnalyticUsersMobileChurnUseCase,
        AnalyticAuthLoginFrequencyUseCase,
        AnalyticAuthLoginMethodUseCase,
        AnalyticAuthLoginSourceUseCase,
        AnalyticAuthLockoutUseCase,
        AnalyticAuthSessionRevokeUseCase,
        AnalyticAuthConcurrentSessionsUseCase,
        AnalyticAuthSessionsGeoUseCase,
        AnalyticAuthSessionsUserAgentUseCase,
        AnalyticAuthRefreshTokenVolumeUseCase,
        AnalyticAuthLogoutRateUseCase,
        AnalyticAuthVerificationFunnelUseCase,
        AnalyticAuthPasswordExpiryUseCase,
        AnalyticAuthPasswordChangeUseCase,
        AnalyticAuthForgotPasswordConversionUseCase,
        AnalyticAuthAdminForcePasswordUseCase,
        AnalyticAuthTwoFactorAdoptionUseCase,
        AnalyticAuthTwoFactorAdminResetUseCase,
        AnalyticAuthTwoFactorVerifySuccessUseCase,
        AnalyticAuthBackupCodeRegenerationUseCase,
        AnalyticAuthTwoFactorAttemptUseCase,
        AnalyticDevicesRegistrationUseCase,
        AnalyticDevicesPlatformUseCase,
        AnalyticDevicesPushTokenUseCase,
        AnalyticDevicesInfoRefreshUseCase,
        AnalyticDevicesSessionRatioUseCase,
        AnalyticDevicesPerUserUseCase,
        AnalyticDevicesInactivityUseCase,
        AnalyticApiKeysLifecycleUseCase,
        AnalyticApiKeysActiveExpiredUseCase,
        AnalyticApiKeysTypeMixUseCase,
        AnalyticTermPoliciesAcceptanceRateUseCase,
        AnalyticTermPoliciesTimeToAcceptUseCase,
        AnalyticWorkspacesCreationUseCase,
        AnalyticWorkspacesVisibilityUseCase,
        AnalyticWorkspacesInviteFunnelUseCase,
        AnalyticWorkspacesJoinOutcomesUseCase,
        AnalyticWorkspacesMembershipUseCase,
        AnalyticWorkspacesActivityVolumeUseCase,
        AnalyticProjectsCreationUseCase,
        AnalyticProjectsMembershipUseCase,
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
        AnalyticRefreshSpikeSummaryUseCase,
        AnalyticRefreshSpikeListUseCase,
        AnalyticBackupCodeNewDeviceSummaryUseCase,
        AnalyticBackupCodeNewDeviceListUseCase,
        AnalyticApiKeyBurstSummaryUseCase,
        AnalyticApiKeyBurstListUseCase,
        AnalyticRiskScoreUseCase,
        AnalyticRiskScoresUseCase,
        AnalyticSummaryUseCase,
        AnalyticInviteFunnelUseCase,
        AnalyticJoinOutcomesUseCase,
        AnalyticMemberRolesUseCase,
        AnalyticActivityUseCase,
    ],
    imports: [AnalyticModule],
})
export class AnalyticUseCaseModule {}

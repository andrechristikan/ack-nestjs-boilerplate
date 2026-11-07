import { DeviceModule } from '@modules/device/device.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { NotificationEmailProcessor } from '@modules/notification/processors/notification.email.processor';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { NotificationPushProcessor } from '@modules/notification/processors/notification.push.processor';
import { NotificationGetListCursorUseCase } from '@modules/notification/use-cases/notification.get-list-cursor.use-case';
import { NotificationGetListUserSettingUseCase } from '@modules/notification/use-cases/notification.get-list-user-setting.use-case';
import { NotificationMarkAsReadUseCase } from '@modules/notification/use-cases/notification.mark-as-read.use-case';
import { NotificationMarkAllAsReadUseCase } from '@modules/notification/use-cases/notification.mark-all-as-read.use-case';
import { NotificationUpdateUserSettingUseCase } from '@modules/notification/use-cases/notification.update-user-setting.use-case';
import { NotificationEmailProcessWelcomeUseCase } from '@modules/notification/use-cases/notification.email.process-welcome.use-case';
import { NotificationEmailProcessWelcomeSocialUseCase } from '@modules/notification/use-cases/notification.email.process-welcome-social.use-case';
import { NotificationEmailProcessWelcomeByAdminUseCase } from '@modules/notification/use-cases/notification.email.process-welcome-by-admin.use-case';
import { NotificationEmailProcessTemporaryPasswordByAdminUseCase } from '@modules/notification/use-cases/notification.email.process-temporary-password-by-admin.use-case';
import { NotificationEmailProcessChangePasswordUseCase } from '@modules/notification/use-cases/notification.email.process-change-password.use-case';
import { NotificationEmailProcessResetPasswordUseCase } from '@modules/notification/use-cases/notification.email.process-reset-password.use-case';
import { NotificationEmailProcessVerificationEmailUseCase } from '@modules/notification/use-cases/notification.email.process-verification-email.use-case';
import { NotificationEmailProcessVerifiedEmailUseCase } from '@modules/notification/use-cases/notification.email.process-verified-email.use-case';
import { NotificationEmailProcessForgotPasswordUseCase } from '@modules/notification/use-cases/notification.email.process-forgot-password.use-case';
import { NotificationEmailProcessVerifiedMobileNumberUseCase } from '@modules/notification/use-cases/notification.email.process-verified-mobile-number.use-case';
import { NotificationEmailProcessResetTwoFactorByAdminUseCase } from '@modules/notification/use-cases/notification.email.process-reset-two-factor-by-admin.use-case';
import { NotificationEmailProcessNewDeviceLoginUseCase } from '@modules/notification/use-cases/notification.email.process-new-device-login.use-case';
import { NotificationEmailProcessPublishTermPolicyUseCase } from '@modules/notification/use-cases/notification.email.process-publish-term-policy.use-case';
import { NotificationEmailProcessWorkspaceInviteUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-invite.use-case';
import { NotificationEmailProcessWorkspaceInviteUnregisteredUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-invite-unregistered.use-case';
import { NotificationEmailProcessWorkspaceJoinRequestUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-join-request.use-case';
import { NotificationEmailProcessWorkspaceJoinAcceptedUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-join-accepted.use-case';
import { NotificationEmailProcessWorkspaceJoinRejectedUseCase } from '@modules/notification/use-cases/notification.email.process-workspace-join-rejected.use-case';
import { NotificationProcessWelcomeByAdminUseCase } from '@modules/notification/use-cases/notification.process-welcome-by-admin.use-case';
import { NotificationProcessWelcomeUseCase } from '@modules/notification/use-cases/notification.process-welcome.use-case';
import { NotificationProcessWelcomeSocialUseCase } from '@modules/notification/use-cases/notification.process-welcome-social.use-case';
import { NotificationProcessVerifiedEmailUseCase } from '@modules/notification/use-cases/notification.process-verified-email.use-case';
import { NotificationProcessVerificationEmailUseCase } from '@modules/notification/use-cases/notification.process-verification-email.use-case';
import { NotificationProcessVerifiedMobileNumberUseCase } from '@modules/notification/use-cases/notification.process-verified-mobile-number.use-case';
import { NotificationProcessTemporaryPasswordByAdminUseCase } from '@modules/notification/use-cases/notification.process-temporary-password-by-admin.use-case';
import { NotificationProcessChangePasswordUseCase } from '@modules/notification/use-cases/notification.process-change-password.use-case';
import { NotificationProcessForgotPasswordUseCase } from '@modules/notification/use-cases/notification.process-forgot-password.use-case';
import { NotificationProcessResetPasswordUseCase } from '@modules/notification/use-cases/notification.process-reset-password.use-case';
import { NotificationProcessResetTwoFactorByAdminUseCase } from '@modules/notification/use-cases/notification.process-reset-two-factor-by-admin.use-case';
import { NotificationProcessNewDeviceLoginUseCase } from '@modules/notification/use-cases/notification.process-new-device-login.use-case';
import { NotificationProcessPublishTermPolicyUseCase } from '@modules/notification/use-cases/notification.process-publish-term-policy.use-case';
import { NotificationProcessUserAcceptTermPolicyUseCase } from '@modules/notification/use-cases/notification.process-user-accept-term-policy.use-case';
import { NotificationProcessWorkspaceInviteUseCase } from '@modules/notification/use-cases/notification.process-workspace-invite.use-case';
import { NotificationProcessWorkspaceJoinRequestUseCase } from '@modules/notification/use-cases/notification.process-workspace-join-request.use-case';
import { NotificationProcessWorkspaceJoinAcceptedUseCase } from '@modules/notification/use-cases/notification.process-workspace-join-accepted.use-case';
import { NotificationProcessWorkspaceJoinRejectedUseCase } from '@modules/notification/use-cases/notification.process-workspace-join-rejected.use-case';
import { NotificationPushProcessNewDeviceLoginUseCase } from '@modules/notification/use-cases/notification.push.process-new-device-login.use-case';
import { NotificationPushProcessResetTwoFactorByAdminUseCase } from '@modules/notification/use-cases/notification.push.process-reset-two-factor-by-admin.use-case';
import { NotificationPushProcessTemporaryPasswordByAdminUseCase } from '@modules/notification/use-cases/notification.push.process-temporary-password-by-admin.use-case';
import { NotificationPushProcessResetPasswordUseCase } from '@modules/notification/use-cases/notification.push.process-reset-password.use-case';
import { NotificationPushProcessForgotPasswordUseCase } from '@modules/notification/use-cases/notification.push.process-forgot-password.use-case';
import { NotificationPushProcessWorkspaceInviteUseCase } from '@modules/notification/use-cases/notification.push.process-workspace-invite.use-case';
import { NotificationPushProcessWorkspaceJoinRequestUseCase } from '@modules/notification/use-cases/notification.push.process-workspace-join-request.use-case';
import { NotificationPushProcessWorkspaceJoinAcceptedUseCase } from '@modules/notification/use-cases/notification.push.process-workspace-join-accepted.use-case';
import { NotificationPushProcessWorkspaceJoinRejectedUseCase } from '@modules/notification/use-cases/notification.push.process-workspace-join-rejected.use-case';
import { NotificationPushProcessCleanupTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-tokens.use-case';
import { NotificationPushProcessCleanupStaleTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-stale-tokens.use-case';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        NotificationGetListCursorUseCase,
        NotificationGetListUserSettingUseCase,
        NotificationMarkAsReadUseCase,
        NotificationMarkAllAsReadUseCase,
        NotificationUpdateUserSettingUseCase,
        NotificationEmailProcessWelcomeUseCase,
        NotificationEmailProcessWelcomeSocialUseCase,
        NotificationEmailProcessWelcomeByAdminUseCase,
        NotificationEmailProcessTemporaryPasswordByAdminUseCase,
        NotificationEmailProcessChangePasswordUseCase,
        NotificationEmailProcessResetPasswordUseCase,
        NotificationEmailProcessVerificationEmailUseCase,
        NotificationEmailProcessVerifiedEmailUseCase,
        NotificationEmailProcessForgotPasswordUseCase,
        NotificationEmailProcessVerifiedMobileNumberUseCase,
        NotificationEmailProcessResetTwoFactorByAdminUseCase,
        NotificationEmailProcessNewDeviceLoginUseCase,
        NotificationEmailProcessPublishTermPolicyUseCase,
        NotificationEmailProcessWorkspaceInviteUseCase,
        NotificationEmailProcessWorkspaceInviteUnregisteredUseCase,
        NotificationEmailProcessWorkspaceJoinRequestUseCase,
        NotificationEmailProcessWorkspaceJoinAcceptedUseCase,
        NotificationEmailProcessWorkspaceJoinRejectedUseCase,
        NotificationProcessWelcomeByAdminUseCase,
        NotificationProcessWelcomeUseCase,
        NotificationProcessWelcomeSocialUseCase,
        NotificationProcessVerifiedEmailUseCase,
        NotificationProcessVerificationEmailUseCase,
        NotificationProcessVerifiedMobileNumberUseCase,
        NotificationProcessTemporaryPasswordByAdminUseCase,
        NotificationProcessChangePasswordUseCase,
        NotificationProcessForgotPasswordUseCase,
        NotificationProcessResetPasswordUseCase,
        NotificationProcessResetTwoFactorByAdminUseCase,
        NotificationProcessNewDeviceLoginUseCase,
        NotificationProcessPublishTermPolicyUseCase,
        NotificationProcessUserAcceptTermPolicyUseCase,
        NotificationProcessWorkspaceInviteUseCase,
        NotificationProcessWorkspaceJoinRequestUseCase,
        NotificationProcessWorkspaceJoinAcceptedUseCase,
        NotificationProcessWorkspaceJoinRejectedUseCase,
        NotificationPushProcessNewDeviceLoginUseCase,
        NotificationPushProcessResetTwoFactorByAdminUseCase,
        NotificationPushProcessTemporaryPasswordByAdminUseCase,
        NotificationPushProcessResetPasswordUseCase,
        NotificationPushProcessForgotPasswordUseCase,
        NotificationPushProcessWorkspaceInviteUseCase,
        NotificationPushProcessWorkspaceJoinRequestUseCase,
        NotificationPushProcessWorkspaceJoinAcceptedUseCase,
        NotificationPushProcessWorkspaceJoinRejectedUseCase,
        NotificationPushProcessCleanupTokensUseCase,
        NotificationPushProcessCleanupStaleTokensUseCase,
        NotificationProcessor,
        NotificationEmailProcessor,
        NotificationPushProcessor,
    ],
    exports: [
        NotificationGetListCursorUseCase,
        NotificationGetListUserSettingUseCase,
        NotificationMarkAsReadUseCase,
        NotificationMarkAllAsReadUseCase,
        NotificationUpdateUserSettingUseCase,
        NotificationEmailProcessWelcomeUseCase,
        NotificationEmailProcessWelcomeSocialUseCase,
        NotificationEmailProcessWelcomeByAdminUseCase,
        NotificationEmailProcessTemporaryPasswordByAdminUseCase,
        NotificationEmailProcessChangePasswordUseCase,
        NotificationEmailProcessResetPasswordUseCase,
        NotificationEmailProcessVerificationEmailUseCase,
        NotificationEmailProcessVerifiedEmailUseCase,
        NotificationEmailProcessForgotPasswordUseCase,
        NotificationEmailProcessVerifiedMobileNumberUseCase,
        NotificationEmailProcessResetTwoFactorByAdminUseCase,
        NotificationEmailProcessNewDeviceLoginUseCase,
        NotificationEmailProcessPublishTermPolicyUseCase,
        NotificationEmailProcessWorkspaceInviteUseCase,
        NotificationEmailProcessWorkspaceInviteUnregisteredUseCase,
        NotificationEmailProcessWorkspaceJoinRequestUseCase,
        NotificationEmailProcessWorkspaceJoinAcceptedUseCase,
        NotificationEmailProcessWorkspaceJoinRejectedUseCase,
        NotificationProcessWelcomeByAdminUseCase,
        NotificationProcessWelcomeUseCase,
        NotificationProcessWelcomeSocialUseCase,
        NotificationProcessVerifiedEmailUseCase,
        NotificationProcessVerificationEmailUseCase,
        NotificationProcessVerifiedMobileNumberUseCase,
        NotificationProcessTemporaryPasswordByAdminUseCase,
        NotificationProcessChangePasswordUseCase,
        NotificationProcessForgotPasswordUseCase,
        NotificationProcessResetPasswordUseCase,
        NotificationProcessResetTwoFactorByAdminUseCase,
        NotificationProcessNewDeviceLoginUseCase,
        NotificationProcessPublishTermPolicyUseCase,
        NotificationProcessUserAcceptTermPolicyUseCase,
        NotificationProcessWorkspaceInviteUseCase,
        NotificationProcessWorkspaceJoinRequestUseCase,
        NotificationProcessWorkspaceJoinAcceptedUseCase,
        NotificationProcessWorkspaceJoinRejectedUseCase,
        NotificationPushProcessNewDeviceLoginUseCase,
        NotificationPushProcessResetTwoFactorByAdminUseCase,
        NotificationPushProcessTemporaryPasswordByAdminUseCase,
        NotificationPushProcessResetPasswordUseCase,
        NotificationPushProcessForgotPasswordUseCase,
        NotificationPushProcessWorkspaceInviteUseCase,
        NotificationPushProcessWorkspaceJoinRequestUseCase,
        NotificationPushProcessWorkspaceJoinAcceptedUseCase,
        NotificationPushProcessWorkspaceJoinRejectedUseCase,
        NotificationPushProcessCleanupTokensUseCase,
        NotificationPushProcessCleanupStaleTokensUseCase,
    ],
    imports: [DeviceModule, UserModule, NotificationModule],
})
export class NotificationUseCaseModule {}

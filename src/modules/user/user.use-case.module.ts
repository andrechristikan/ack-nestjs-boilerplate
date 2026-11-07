import { CountryModule } from '@modules/country/country.module';
import { DeviceModule } from '@modules/device/device.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { ProjectModule } from '@modules/project/project.module';
import { UserProcessor } from '@modules/user/processors/user.processor';
import { UserModule } from '@modules/user/user.module';
import { UserLoginWithSocialUseCase } from '@modules/user/use-cases/user.login-with-social.use-case';
import { UserLoginCredentialUseCase } from '@modules/user/use-cases/user.login-credential.use-case';
import { UserLoginVerifyTwoFactorUseCase } from '@modules/user/use-cases/user.login-verify-two-factor.use-case';
import { UserLoginSetupTwoFactorUseCase } from '@modules/user/use-cases/user.login-setup-two-factor.use-case';
import { UserRefreshUseCase } from '@modules/user/use-cases/user.refresh.use-case';
import { UserLogoutUseCase } from '@modules/user/use-cases/user.logout.use-case';
import { UserSignUpUseCase } from '@modules/user/use-cases/user.sign-up.use-case';
import { UserCreateByAdminUseCase } from '@modules/user/use-cases/user.create-by-admin.use-case';
import { UserImportByAdminUseCase } from '@modules/user/use-cases/user.import-by-admin.use-case';
import { UserExportByAdminUseCase } from '@modules/user/use-cases/user.export-by-admin.use-case';
import { UserGetListOffsetByAdminUseCase } from '@modules/user/use-cases/user.get-list-offset-by-admin.use-case';
import { UserGetOneUseCase } from '@modules/user/use-cases/user.get-one.use-case';
import { UserUpdateStatusByAdminUseCase } from '@modules/user/use-cases/user.update-status-by-admin.use-case';
import { UserCheckUsernameUseCase } from '@modules/user/use-cases/user.check-username.use-case';
import { UserCheckEmailUseCase } from '@modules/user/use-cases/user.check-email.use-case';
import { UserDeleteSelfUseCase } from '@modules/user/use-cases/user.delete-self.use-case';
import { UserAddMobileNumberUseCase } from '@modules/user/use-cases/user.add-mobile-number.use-case';
import { UserUpdateMobileNumberUseCase } from '@modules/user/use-cases/user.update-mobile-number.use-case';
import { UserDeleteMobileNumberUseCase } from '@modules/user/use-cases/user.delete-mobile-number.use-case';
import { UserUpdatePasswordByAdminUseCase } from '@modules/user/use-cases/user.update-password-by-admin.use-case';
import { UserChangePasswordUseCase } from '@modules/user/use-cases/user.change-password.use-case';
import { UserForgotPasswordUseCase } from '@modules/user/use-cases/user.forgot-password.use-case';
import { UserResetPasswordUseCase } from '@modules/user/use-cases/user.reset-password.use-case';
import { UserGetProfileUseCase } from '@modules/user/use-cases/user.get-profile.use-case';
import { UserUpdateProfileUseCase } from '@modules/user/use-cases/user.update-profile.use-case';
import { UserGeneratePhotoProfilePresignUseCase } from '@modules/user/use-cases/user.generate-photo-profile-presign.use-case';
import { UserUpdatePhotoProfileUseCase } from '@modules/user/use-cases/user.update-photo-profile.use-case';
import { UserUploadPhotoProfileUseCase } from '@modules/user/use-cases/user.upload-photo-profile.use-case';
import { UserClaimUsernameUseCase } from '@modules/user/use-cases/user.claim-username.use-case';
import { UserGetTwoFactorStatusUseCase } from '@modules/user/use-cases/user.get-two-factor-status.use-case';
import { UserSetupTwoFactorUseCase } from '@modules/user/use-cases/user.setup-two-factor.use-case';
import { UserEnableTwoFactorUseCase } from '@modules/user/use-cases/user.enable-two-factor.use-case';
import { UserDisableTwoFactorUseCase } from '@modules/user/use-cases/user.disable-two-factor.use-case';
import { UserRegenerateTwoFactorBackupCodesUseCase } from '@modules/user/use-cases/user.regenerate-two-factor-backup-codes.use-case';
import { UserResetTwoFactorByAdminUseCase } from '@modules/user/use-cases/user.reset-two-factor-by-admin.use-case';
import { UserVerifyEmailUseCase } from '@modules/user/use-cases/user.verify-email.use-case';
import { UserSendVerificationEmailUseCase } from '@modules/user/use-cases/user.send-verification-email.use-case';
import { UserProcessDeletePhotoUseCase } from '@modules/user/use-cases/user.process-delete-photo.use-case';
import { UserProcessLockoutUseCase } from '@modules/user/use-cases/user.process-lockout.use-case';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        UserLoginWithSocialUseCase,
        UserLoginCredentialUseCase,
        UserLoginVerifyTwoFactorUseCase,
        UserLoginSetupTwoFactorUseCase,
        UserRefreshUseCase,
        UserLogoutUseCase,
        UserSignUpUseCase,
        UserCreateByAdminUseCase,
        UserImportByAdminUseCase,
        UserExportByAdminUseCase,
        UserGetListOffsetByAdminUseCase,
        UserGetOneUseCase,
        UserUpdateStatusByAdminUseCase,
        UserCheckUsernameUseCase,
        UserCheckEmailUseCase,
        UserDeleteSelfUseCase,
        UserAddMobileNumberUseCase,
        UserUpdateMobileNumberUseCase,
        UserDeleteMobileNumberUseCase,
        UserUpdatePasswordByAdminUseCase,
        UserChangePasswordUseCase,
        UserForgotPasswordUseCase,
        UserResetPasswordUseCase,
        UserGetProfileUseCase,
        UserUpdateProfileUseCase,
        UserGeneratePhotoProfilePresignUseCase,
        UserUpdatePhotoProfileUseCase,
        UserUploadPhotoProfileUseCase,
        UserClaimUsernameUseCase,
        UserGetTwoFactorStatusUseCase,
        UserSetupTwoFactorUseCase,
        UserEnableTwoFactorUseCase,
        UserDisableTwoFactorUseCase,
        UserRegenerateTwoFactorBackupCodesUseCase,
        UserResetTwoFactorByAdminUseCase,
        UserVerifyEmailUseCase,
        UserSendVerificationEmailUseCase,
        UserProcessDeletePhotoUseCase,
        UserProcessLockoutUseCase,
        UserProcessor,
    ],
    exports: [
        UserLoginWithSocialUseCase,
        UserLoginCredentialUseCase,
        UserLoginVerifyTwoFactorUseCase,
        UserLoginSetupTwoFactorUseCase,
        UserRefreshUseCase,
        UserLogoutUseCase,
        UserSignUpUseCase,
        UserCreateByAdminUseCase,
        UserImportByAdminUseCase,
        UserExportByAdminUseCase,
        UserGetListOffsetByAdminUseCase,
        UserGetOneUseCase,
        UserUpdateStatusByAdminUseCase,
        UserCheckUsernameUseCase,
        UserCheckEmailUseCase,
        UserDeleteSelfUseCase,
        UserAddMobileNumberUseCase,
        UserUpdateMobileNumberUseCase,
        UserDeleteMobileNumberUseCase,
        UserUpdatePasswordByAdminUseCase,
        UserChangePasswordUseCase,
        UserForgotPasswordUseCase,
        UserResetPasswordUseCase,
        UserGetProfileUseCase,
        UserUpdateProfileUseCase,
        UserGeneratePhotoProfilePresignUseCase,
        UserUpdatePhotoProfileUseCase,
        UserUploadPhotoProfileUseCase,
        UserClaimUsernameUseCase,
        UserGetTwoFactorStatusUseCase,
        UserSetupTwoFactorUseCase,
        UserEnableTwoFactorUseCase,
        UserDisableTwoFactorUseCase,
        UserRegenerateTwoFactorBackupCodesUseCase,
        UserResetTwoFactorByAdminUseCase,
        UserVerifyEmailUseCase,
        UserSendVerificationEmailUseCase,
        UserProcessDeletePhotoUseCase,
        UserProcessLockoutUseCase,
    ],
    imports: [
        CountryModule,
        DeviceModule,
        PasswordHistoryModule,
        ProjectModule,
        UserModule,
        WorkspaceModule,
        NotificationModule,
    ],
})
export class UserUseCaseModule {}

import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { CountryModule } from '@modules/country/country.module';
import { DeviceModule } from '@modules/device/device.module';
import { MfaModule } from '@modules/mfa/mfa.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { ProjectModule } from '@modules/project/project.module';
import { UserModule } from '@modules/user/user.module';
import { UserLoginWithSocialUseCase } from '@modules/user/use-cases/user.login-with-social.use-case';
import { UserLoginCredentialUseCase } from '@modules/user/use-cases/user.login-credential.use-case';
import { UserLoginVerifyMfaUseCase } from '@modules/user/use-cases/user.login-verify-mfa.use-case';
import { UserLoginGeneratePasskeyUseCase } from '@modules/user/use-cases/user.login-generate-passkey.use-case';
import { UserLoginWithPasskeyUseCase } from '@modules/user/use-cases/user.login-with-passkey.use-case';
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
import { UserResetPasswordGenerateMfaUseCase } from '@modules/user/use-cases/user.reset-password-generate-mfa.use-case';
import { UserGetProfileUseCase } from '@modules/user/use-cases/user.get-profile.use-case';
import { UserUpdateProfileUseCase } from '@modules/user/use-cases/user.update-profile.use-case';
import { UserGeneratePhotoProfilePresignUseCase } from '@modules/user/use-cases/user.generate-photo-profile-presign.use-case';
import { UserUpdatePhotoProfileUseCase } from '@modules/user/use-cases/user.update-photo-profile.use-case';
import { UserUploadPhotoProfileUseCase } from '@modules/user/use-cases/user.upload-photo-profile.use-case';
import { UserClaimUsernameUseCase } from '@modules/user/use-cases/user.claim-username.use-case';
import { UserVerifyEmailUseCase } from '@modules/user/use-cases/user.verify-email.use-case';
import { UserSendVerificationEmailUseCase } from '@modules/user/use-cases/user.send-verification-email.use-case';
import { UserSendReauthenticationOtpUseCase } from '@modules/user/use-cases/user.send-reauthentication-otp.use-case';
import { UserSendVerificationMobileNumberUseCase } from '@modules/user/use-cases/user.send-verification-mobile-number.use-case';
import { UserVerifyMobileNumberUseCase } from '@modules/user/use-cases/user.verify-mobile-number.use-case';
import { UserProcessDeletePhotoUseCase } from '@modules/user/use-cases/user.process-delete-photo.use-case';
import { UserProcessImportByAdminUseCase } from '@modules/user/use-cases/user.process-import-by-admin.use-case';
import { UserProcessPurgeExpiredUseCase } from '@modules/user/use-cases/user.process-purge-expired.use-case';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        UserLoginWithSocialUseCase,
        UserLoginCredentialUseCase,
        UserLoginVerifyMfaUseCase,
        UserLoginGeneratePasskeyUseCase,
        UserLoginWithPasskeyUseCase,
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
        UserResetPasswordGenerateMfaUseCase,
        UserGetProfileUseCase,
        UserUpdateProfileUseCase,
        UserGeneratePhotoProfilePresignUseCase,
        UserUpdatePhotoProfileUseCase,
        UserUploadPhotoProfileUseCase,
        UserClaimUsernameUseCase,
        UserVerifyEmailUseCase,
        UserSendVerificationEmailUseCase,
        UserSendReauthenticationOtpUseCase,
        UserSendVerificationMobileNumberUseCase,
        UserVerifyMobileNumberUseCase,
        UserProcessDeletePhotoUseCase,
        UserProcessImportByAdminUseCase,
        UserProcessPurgeExpiredUseCase,
    ],
    exports: [
        UserLoginWithSocialUseCase,
        UserLoginCredentialUseCase,
        UserLoginVerifyMfaUseCase,
        UserLoginGeneratePasskeyUseCase,
        UserLoginWithPasskeyUseCase,
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
        UserResetPasswordGenerateMfaUseCase,
        UserGetProfileUseCase,
        UserUpdateProfileUseCase,
        UserGeneratePhotoProfilePresignUseCase,
        UserUpdatePhotoProfileUseCase,
        UserUploadPhotoProfileUseCase,
        UserClaimUsernameUseCase,
        UserVerifyEmailUseCase,
        UserSendVerificationEmailUseCase,
        UserSendReauthenticationOtpUseCase,
        UserSendVerificationMobileNumberUseCase,
        UserVerifyMobileNumberUseCase,
        UserProcessDeletePhotoUseCase,
        UserProcessImportByAdminUseCase,
        UserProcessPurgeExpiredUseCase,
    ],
    imports: [
        ActivityLogModule,
        CountryModule,
        DeviceModule,
        MfaModule,
        PasswordHistoryModule,
        ProjectModule,
        UserModule,
        WorkspaceModule,
        NotificationModule,
    ],
})
export class UserUseCaseModule {}

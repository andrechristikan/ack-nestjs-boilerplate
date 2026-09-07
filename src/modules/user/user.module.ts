import { AwsModule } from '@common/aws/aws.module';
import { CountryRepositoryModule } from '@modules/country/country.repository.module';
import { DeviceModule } from '@modules/device/device.module';
import { PasswordHistoryRepositoryModule } from '@modules/password-history/password-history.repository.module';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserLoginService } from '@modules/user/services/user.login.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { UserService } from '@modules/user/services/user.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserRepositoryModule } from '@modules/user/user.repository.module';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { Module } from '@nestjs/common';

/** User domain services backing `UserGuard` and the user HTTP layer. */
@Module({
    controllers: [],
    providers: [
        UserService,
        UserAuthService,
        UserLoginService,
        UserImportService,
        UserPasswordService,
        UserVerificationService,
        UserTwoFactorService,
        UserProfileService,
        UserMobileNumberService,
        UserUtil,
        UserOnboardingUtil,
    ],
    exports: [
        UserService,
        UserAuthService,
        UserImportService,
        UserPasswordService,
        UserVerificationService,
        UserTwoFactorService,
        UserProfileService,
        UserMobileNumberService,
        UserUtil,
        UserOnboardingUtil,
    ],
    imports: [
        UserRepositoryModule,
        CountryRepositoryModule,
        PasswordHistoryRepositoryModule,
        DeviceModule,
        AwsModule,
    ],
})
export class UserModule {}

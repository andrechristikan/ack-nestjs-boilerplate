import { AwsModule } from '@common/aws/aws.module';
import { CountryDomainModule } from '@modules/country/country.domain.module';
import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { PasswordHistoryDomainModule } from '@modules/password-history/password-history.domain.module';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserRepositoryModule } from '@modules/user/user.repository.module';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { Module } from '@nestjs/common';

/** User domains backing `UserGuard` and the user HTTP layer. */
@Module({
    controllers: [],
    providers: [
        UserDomain,
        UserAuthDomain,
        UserLoginDomain,
        UserImportDomain,
        UserPasswordDomain,
        UserVerificationDomain,
        UserTwoFactorDomain,
        UserProfileDomain,
        UserMobileNumberDomain,
        UserOnboardingDomain,
        UserUtil,
        UserOnboardingUtil,
    ],
    exports: [
        UserDomain,
        UserAuthDomain,
        UserImportDomain,
        UserPasswordDomain,
        UserVerificationDomain,
        UserTwoFactorDomain,
        UserProfileDomain,
        UserMobileNumberDomain,
        UserOnboardingDomain,
        UserOnboardingUtil,
        UserUtil,
    ],
    imports: [
        UserRepositoryModule,
        CountryDomainModule,
        PasswordHistoryDomainModule,
        DeviceDomainModule,
        AwsModule,
    ],
})
export class UserDomainModule {}

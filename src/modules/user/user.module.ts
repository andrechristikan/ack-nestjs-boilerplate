import { Module } from '@nestjs/common';
import { UserService } from '@modules/user/services/user.service';
import { AwsModule } from '@common/aws/aws.module';
import { PasswordHistoryRepositoryModule } from '@modules/password-history/password-history.repository.module';
import { UserImportRepository } from '@modules/user/repositories/user.import.repository';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserOnboardingRepository } from '@modules/user/repositories/user.onboarding.repository';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserSessionRepository } from '@modules/user/repositories/user.session.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { CountryRepositoryModule } from '@modules/country/country.repository.module';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { DeviceUtilModule } from '@modules/device/device.util.module';

/**
 * Exports user providers; controllers are wired through the router
 * (`routes.shared` / `routes.admin`), not registered here.
 */
@Module({
    imports: [
        PasswordHistoryRepositoryModule,
        AwsModule,
        CountryRepositoryModule,
        WorkspaceModule,
        DeviceUtilModule,
    ],
    exports: [
        UserService,
        UserRepository,
        UserOnboardingRepository,
        UserImportRepository,
        UserPasswordRepository,
        UserVerificationRepository,
        UserTwoFactorRepository,
        UserSessionRepository,
        UserMobileNumberRepository,
        UserUtil,
        UserOnboardingUtil,
    ],
    providers: [
        UserService,
        UserRepository,
        UserOnboardingRepository,
        UserImportRepository,
        UserPasswordRepository,
        UserVerificationRepository,
        UserTwoFactorRepository,
        UserSessionRepository,
        UserMobileNumberRepository,
        UserUtil,
        UserOnboardingUtil,
    ],
    controllers: [],
})
export class UserModule {}

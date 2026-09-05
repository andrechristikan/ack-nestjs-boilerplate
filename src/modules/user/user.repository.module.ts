import { UserImportRepository } from '@modules/user/repositories/user.import.repository';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserOnboardingRepository } from '@modules/user/repositories/user.onboarding.repository';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserSessionRepository } from '@modules/user/repositories/user.session.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        UserRepository,
        UserOnboardingRepository,
        UserImportRepository,
        UserPasswordRepository,
        UserVerificationRepository,
        UserTwoFactorRepository,
        UserSessionRepository,
        UserMobileNumberRepository,
    ],
    exports: [
        UserRepository,
        UserOnboardingRepository,
        UserImportRepository,
        UserPasswordRepository,
        UserVerificationRepository,
        UserTwoFactorRepository,
        UserSessionRepository,
        UserMobileNumberRepository,
    ],
    imports: [],
})
export class UserRepositoryModule {}

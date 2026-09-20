import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { Module } from '@nestjs/common';
import { UserAnalyticRepository } from '@modules/user/repositories/user.analytic.repository';
import { UserForgotPasswordAnalyticRepository } from '@modules/user/repositories/user.forgot-password.analytic.repository';
import { UserTwoFactorAnalyticRepository } from '@modules/user/repositories/user.two-factor.analytic.repository';
import { UserVerificationAnalyticRepository } from '@modules/user/repositories/user.verification.analytic.repository';
import { UserMobileNumberAnalyticRepository } from '@modules/user/repositories/user.mobile-number.analytic.repository';

@Module({
    controllers: [],
    providers: [
        UserRepository,
        UserPasswordRepository,
        UserVerificationRepository,
        UserTwoFactorRepository,
        UserMobileNumberRepository,
        UserAnalyticRepository,
        UserForgotPasswordAnalyticRepository,
        UserTwoFactorAnalyticRepository,
        UserVerificationAnalyticRepository,
        UserMobileNumberAnalyticRepository,
    ],
    exports: [
        UserRepository,
        UserPasswordRepository,
        UserVerificationRepository,
        UserTwoFactorRepository,
        UserMobileNumberRepository,
        UserAnalyticRepository,
        UserForgotPasswordAnalyticRepository,
        UserTwoFactorAnalyticRepository,
        UserVerificationAnalyticRepository,
        UserMobileNumberAnalyticRepository,
    ],
    imports: [],
})
export class UserRepositoryModule {}

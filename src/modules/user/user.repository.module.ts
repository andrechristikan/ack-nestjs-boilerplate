import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        UserRepository,
        UserPasswordRepository,
        UserVerificationRepository,
        UserTwoFactorRepository,
        UserMobileNumberRepository,
    ],
    exports: [
        UserRepository,
        UserPasswordRepository,
        UserVerificationRepository,
        UserTwoFactorRepository,
        UserMobileNumberRepository,
    ],
    imports: [],
})
export class UserRepositoryModule {}

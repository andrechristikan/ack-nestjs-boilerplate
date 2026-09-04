import { UserAuthHttpService } from '@modules/user/services/user.auth.http.service';
import { UserHttpService } from '@modules/user/services/user.http.service';
import { UserImportHttpService } from '@modules/user/services/user.import.http.service';
import { UserMobileNumberHttpService } from '@modules/user/services/user.mobile-number.http.service';
import { UserPasswordHttpService } from '@modules/user/services/user.password.http.service';
import { UserProfileHttpService } from '@modules/user/services/user.profile.http.service';
import { UserTwoFactorHttpService } from '@modules/user/services/user.two-factor.http.service';
import { UserVerificationHttpService } from '@modules/user/services/user.verification.http.service';
import { UserModule } from '@modules/user/user.module';
import { UserUtilModule } from '@modules/user/user.util.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        UserHttpService,
        UserAuthHttpService,
        UserImportHttpService,
        UserPasswordHttpService,
        UserVerificationHttpService,
        UserTwoFactorHttpService,
        UserProfileHttpService,
        UserMobileNumberHttpService,
    ],
    exports: [
        UserHttpService,
        UserAuthHttpService,
        UserImportHttpService,
        UserPasswordHttpService,
        UserVerificationHttpService,
        UserTwoFactorHttpService,
        UserProfileHttpService,
        UserMobileNumberHttpService,
        UserModule,
    ],
    imports: [UserModule, UserUtilModule],
})
export class UserHttpModule {}

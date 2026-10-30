import { CountryDomainModule } from '@modules/country/country.domain.module';
import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { PasswordHistoryDomainModule } from '@modules/password-history/password-history.domain.module';
import { ProjectDomainModule } from '@modules/project/project.domain.module';
import { UserAuthHttpService } from '@modules/user/services/http/user.auth.http.service';
import { UserExportHttpService } from '@modules/user/services/http/user.export.http.service';
import { UserHttpService } from '@modules/user/services/http/user.http.service';
import { UserMobileNumberHttpService } from '@modules/user/services/http/user.mobile-number.http.service';
import { UserPasswordHttpService } from '@modules/user/services/http/user.password.http.service';
import { UserProfileHttpService } from '@modules/user/services/http/user.profile.http.service';
import { UserRegistrationHttpService } from '@modules/user/services/http/user.registration.http.service';
import { UserTwoFactorHttpService } from '@modules/user/services/http/user.two-factor.http.service';
import { UserVerificationHttpService } from '@modules/user/services/http/user.verification.http.service';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { WorkspaceDomainModule } from '@modules/workspace/workspace.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        UserHttpService,
        UserAuthHttpService,
        UserRegistrationHttpService,
        UserExportHttpService,
        UserPasswordHttpService,
        UserVerificationHttpService,
        UserTwoFactorHttpService,
        UserProfileHttpService,
        UserMobileNumberHttpService,
    ],
    exports: [
        UserHttpService,
        UserAuthHttpService,
        UserRegistrationHttpService,
        UserExportHttpService,
        UserPasswordHttpService,
        UserVerificationHttpService,
        UserTwoFactorHttpService,
        UserProfileHttpService,
        UserMobileNumberHttpService,
    ],
    imports: [
        CountryDomainModule,
        DeviceDomainModule,
        PasswordHistoryDomainModule,
        ProjectDomainModule,
        UserDomainModule,
        WorkspaceDomainModule,
    ],
})
export class UserHttpModule {}

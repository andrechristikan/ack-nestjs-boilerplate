import { Module } from '@nestjs/common';
import { UserService } from '@modules/user/services/user.service';
import { AwsModule } from '@common/aws/aws.module';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { UserSharedModule } from '@modules/user/user.shared.module';
import { CountrySharedModule } from '@modules/country/country.shared.module';
import { RoleSharedModule } from '@modules/role/role.shared.module';
import { PasswordHistorySharedModule } from '@modules/password-history/password-history.shared.module';
import { SessionSharedModule } from '@modules/session/session.shared.module';
import { EmailSharedModule } from '@modules/email/email.shared.module';
import { AuthSharedModule } from '@modules/auth/auth.shared.module';
import { FeatureFlagSharedModule } from '@modules/feature-flag/feature-flag.shared.module';
import { NotificationSharedModule } from '@modules/notification/notification.shared.module';

@Module({
    imports: [
        PasswordHistoryModule,
        CountrySharedModule,
        RoleSharedModule,
        UserSharedModule,
        PasswordHistorySharedModule,
        SessionSharedModule,
        EmailSharedModule,
        AuthSharedModule,
        FeatureFlagSharedModule,
        NotificationSharedModule,

        AwsModule,
    ],
    exports: [UserService],
    providers: [UserService],
    controllers: [],
})
export class UserModule {}

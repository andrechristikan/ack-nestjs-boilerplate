import { Module } from '@nestjs/common';
import { UserService } from '@modules/user/services/user.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { CountryModule } from '@modules/country/country.module';
import { RoleModule } from '@modules/role/role.module';
import { AwsModule } from '@common/aws/aws.module';
import { FileModule } from '@common/file/file.module';
import { SessionModule } from '@modules/session/session.module';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { EmailModule } from '@modules/email/email.module';

@Module({
    imports: [
        PasswordHistoryModule,
        CountryModule,
        RoleModule,
        AwsModule,
        FileModule,
        SessionModule,
        EmailModule,
    ],
    exports: [UserService, UserUtil, UserRepository],
    providers: [UserService, UserUtil, UserRepository],
    controllers: [],
})
export class UserModule {}

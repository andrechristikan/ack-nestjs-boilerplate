import { Module } from '@nestjs/common';
import { UserService } from '@modules/user/services/user.service';
import { AwsModule } from '@common/aws/aws.module';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { CountryModule } from '@modules/country/country.module';
import { TenantModule } from '@modules/tenant/tenant.module';

@Module({
    imports: [PasswordHistoryModule, AwsModule, CountryModule, TenantModule],
    exports: [UserService, UserRepository, UserUtil],
    providers: [UserService, UserRepository, UserUtil],
    controllers: [],
})
export class UserModule {}

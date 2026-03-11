import { Module } from '@nestjs/common';
import { UserService } from '@modules/user/services/user.service';
import { AwsModule } from '@common/aws/aws.module';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { CountryModule } from '@modules/country/country.module';
import { DeviceModule } from '@modules/device/device.module';

@Module({
    imports: [PasswordHistoryModule, AwsModule, CountryModule],
    exports: [UserService, UserRepository, UserUtil],
    providers: [UserService, UserRepository, UserUtil],
    controllers: [],
})
export class UserModule {}

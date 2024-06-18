import { Module } from '@nestjs/common';
import { AuthModule } from 'src/common/auth/auth.module';
import { CountryModule } from 'src/modules/country/country.module';
import { EmailModule } from 'src/modules/email/email.module';
import { HelloPublicController } from 'src/modules/hello/controllers/hello.public.controller';
import { RoleModule } from 'src/modules/role/role.module';
import { SettingModule } from 'src/modules/setting/setting.module';
import { UserPublicController } from 'src/modules/user/controllers/user.public.controller';
import { UserModule } from 'src/modules/user/user.module';

@Module({
    controllers: [HelloPublicController, UserPublicController],
    providers: [],
    exports: [],
    imports: [
        SettingModule,
        UserModule,
        AuthModule,
        RoleModule,
        EmailModule,
        CountryModule,
    ],
})
export class RoutesPublicModule {}

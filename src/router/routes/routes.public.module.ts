import { AuthModule } from '@modules/auth/auth.module';
import { CountryPublicController } from '@modules/country/controllers/country.public.controller';
import { CountryModule } from '@modules/country/country.module';
import { HelloPublicController } from '@modules/hello/controllers/hello.public.controller';
import { HelloModule } from '@modules/hello/hello.module';
import { RolePublicController } from '@modules/role/controllers/role.public.controller';
import { UserPublicController } from '@modules/user/controllers/user.public.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
@Module({
    controllers: [
        CountryPublicController,
        RolePublicController,
        HelloPublicController,
        UserPublicController,
    ],
    providers: [],
    exports: [],
    imports: [CountryModule, HelloModule, UserModule, AuthModule],
})
export class RoutesPublicModule {}

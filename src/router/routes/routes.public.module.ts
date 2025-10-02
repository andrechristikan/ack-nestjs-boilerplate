import { CountryPublicController } from '@modules/country/controllers/country.public.controller';
import { CountryModule } from '@modules/country/country.module';
import { HelloPublicController } from '@modules/hello/controllers/hello.public.controller';
import { HelloModule } from '@modules/hello/hello.module';
import { RolePublicController } from '@modules/role/controllers/role.public.controller';
import { Module } from '@nestjs/common';
@Module({
    controllers: [
        CountryPublicController,
        RolePublicController,
        HelloPublicController,
    ],
    providers: [],
    exports: [],
    imports: [CountryModule, HelloModule],
})
export class RoutesPublicModule {}

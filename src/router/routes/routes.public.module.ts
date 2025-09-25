import { CountryPublicController } from '@modules/country/controllers/country.public.controller';
import { CountryModule } from '@modules/country/country.module';
import { RolePublicController } from '@modules/role/controllers/role.public.controller';
import { Module } from '@nestjs/common';
@Module({
    controllers: [CountryPublicController, RolePublicController],
    providers: [],
    exports: [],
    imports: [CountryModule],
})
export class RoutesPublicModule {}

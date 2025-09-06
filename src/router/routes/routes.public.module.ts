import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { CountryPublicController } from '@modules/country/controllers/country.public.controller';
import { CountryModule } from '@modules/country/country.module';
import { RolePublicController } from '@modules/role/controllers/role.public.controller';
import { RoleModule } from '@modules/role/role.module';
import { Module } from '@nestjs/common';
@Module({
    controllers: [CountryPublicController, RolePublicController],
    providers: [],
    exports: [],
    imports: [ApiKeyModule, CountryModule, RoleModule],
})
export class RoutesPublicModule {}

import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { CountryPublicController } from '@modules/country/controllers/country.public.controller';
import { CountryModule } from '@modules/country/country.module';
import { Module } from '@nestjs/common';
@Module({
    controllers: [CountryPublicController],
    providers: [],
    exports: [],
    imports: [ApiKeyModule, CountryModule],
})
export class RoutesPublicModule {}

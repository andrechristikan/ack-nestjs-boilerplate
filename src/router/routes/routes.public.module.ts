import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { CountryPublicController } from '@modules/country/controllers/country.public.controller';
import { CountryModule } from '@modules/country/country.module';
import { UserPublicController } from '@modules/user/controllers/user.public.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
@Module({
    controllers: [CountryPublicController, UserPublicController],
    providers: [],
    exports: [],
    imports: [ApiKeyModule, CountryModule, UserModule],
})
export class RoutesPublicModule {}

import { Module } from '@nestjs/common';
import { CountryService } from '@modules/country/services/country.service';
import { CountryUtil } from '@modules/country/utils/country.util';

@Module({
    imports: [],
    exports: [CountryService, CountryUtil],
    providers: [CountryService, CountryUtil],
    controllers: [],
})
export class CountryModule {}

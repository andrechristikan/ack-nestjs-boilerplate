import { Module } from '@nestjs/common';
import { CountryService } from '@modules/country/services/country.service';
import { CountryRepository } from '@modules/country/repositories/country.repository';
import { CountryUtil } from '@modules/country/utils/country.util';

@Module({
    imports: [],
    exports: [CountryService, CountryRepository, CountryUtil],
    providers: [CountryService, CountryRepository, CountryUtil],
    controllers: [],
})
export class CountryModule {}

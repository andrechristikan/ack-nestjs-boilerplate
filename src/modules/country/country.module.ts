import { Module } from '@nestjs/common';
import { CountryService } from '@modules/country/services/country.service';
import { CountryUtil } from '@modules/country/utils/country.util';
import { CountryRepository } from '@modules/country/repositories/country.repository';

@Module({
    imports: [],
    exports: [CountryService, CountryUtil, CountryRepository],
    providers: [CountryService, CountryUtil, CountryRepository],
    controllers: [],
})
export class CountryModule {}

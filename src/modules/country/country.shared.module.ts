import { Module } from '@nestjs/common';
import { CountryUtil } from '@modules/country/utils/country.util';
import { CountryRepository } from '@modules/country/repositories/country.repository';

@Module({
    imports: [],
    exports: [CountryRepository, CountryUtil],
    providers: [CountryRepository, CountryUtil],
    controllers: [],
})
export class CountrySharedModule {}

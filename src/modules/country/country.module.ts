import { CountryRepository } from '@modules/country/repositories/country.repository';
import { CountryService } from '@modules/country/services/country.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [CountryRepository, CountryService],
    exports: [CountryService],
    imports: [],
})
export class CountryModule {}

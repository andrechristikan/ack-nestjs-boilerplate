import { CountryRepository } from '@modules/country/repositories/country.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [CountryRepository],
    exports: [CountryRepository],
    imports: [],
})
export class CountryRepositoryModule {}

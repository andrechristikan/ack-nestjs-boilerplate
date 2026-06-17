import { Module } from '@nestjs/common';
import { CountryService } from '@modules/country/services/country.service';
import { CountryRepository } from '@modules/country/repositories/country.repository';
import { CountryUtil } from '@modules/country/utils/country.util';

/**
 * Provides country lookup; controllers are wired by the route layer.
 */
@Module({
    imports: [],
    exports: [CountryService, CountryRepository, CountryUtil],
    providers: [CountryService, CountryRepository, CountryUtil],
    controllers: [],
})
export class CountryModule {}

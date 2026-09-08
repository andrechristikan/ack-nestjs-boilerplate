import { CountryRepositoryModule } from '@modules/country/country.repository.module';
import { CountryService } from '@modules/country/services/country.service';
import { Module } from '@nestjs/common';

/**
 * Provides country lookup; controllers are wired by the route layer.
 */
@Module({
    controllers: [],
    providers: [CountryService],
    exports: [CountryService],
    imports: [CountryRepositoryModule],
})
export class CountryModule {}

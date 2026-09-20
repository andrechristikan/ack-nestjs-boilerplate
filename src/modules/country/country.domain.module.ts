import { CountryRepositoryModule } from '@modules/country/country.repository.module';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { Module } from '@nestjs/common';

/**
 * Provides country lookup; controllers are wired by the route layer.
 */
@Module({
    controllers: [],
    providers: [CountryDomain],
    exports: [CountryDomain],
    imports: [CountryRepositoryModule],
})
export class CountryDomainModule {}

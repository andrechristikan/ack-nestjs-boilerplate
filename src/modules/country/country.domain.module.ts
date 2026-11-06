import { CountryRepositoryModule } from '@modules/country/country.repository.module';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [CountryDomain],
    exports: [CountryDomain],
    imports: [CountryRepositoryModule],
})
export class CountryDomainModule {}

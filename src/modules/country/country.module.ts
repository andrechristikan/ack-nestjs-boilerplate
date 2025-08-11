import { Module } from '@nestjs/common';
import { CountryRepositoryModule } from '@modules/country/repository/country.repository.module';
import { CountryService } from '@modules/country/services/country.service';

@Module({
    imports: [CountryRepositoryModule],
    exports: [CountryService, CountryRepositoryModule],
    providers: [CountryService],
    controllers: [],
})
export class CountryModule {}

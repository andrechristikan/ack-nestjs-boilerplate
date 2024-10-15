import { Module } from '@nestjs/common';
import { CountryRepositoryModule } from 'src/modules/country/repository/country.repository.module';
import { CountryService } from 'src/modules/country/services/country.service';

@Module({
    imports: [CountryRepositoryModule],
    exports: [CountryService],
    providers: [CountryService],
    controllers: [],
})
export class CountryModule {}

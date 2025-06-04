import { Module } from '@nestjs/common';
import { CountryRepositoryModule } from '@module/country/repository/country.repository.module';
import { CountryService } from '@module/country/services/country.service';

@Module({
    imports: [CountryRepositoryModule],
    exports: [CountryService],
    providers: [CountryService],
    controllers: [],
})
export class CountryModule {}

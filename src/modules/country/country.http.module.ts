import { CountryDomainModule } from '@modules/country/country.domain.module';
import { CountryHttpService } from '@modules/country/services/country.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [CountryHttpService],
    exports: [CountryHttpService],
    imports: [CountryDomainModule],
})
export class CountryHttpModule {}

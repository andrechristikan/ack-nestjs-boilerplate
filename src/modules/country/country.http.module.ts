import { CountryModule } from '@modules/country/country.module';
import { CountryHttpService } from '@modules/country/services/country.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [CountryHttpService],
    exports: [CountryHttpService],
    imports: [CountryModule],
})
export class CountryHttpModule {}

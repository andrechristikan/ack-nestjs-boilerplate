import { Module } from '@nestjs/common';
import { CountryService } from '@modules/country/services/country.service';
import { CountrySharedModule } from '@modules/country/country.shared.module';

@Module({
    imports: [CountrySharedModule],
    exports: [CountryService],
    providers: [CountryService],
    controllers: [],
})
export class CountryModule {}

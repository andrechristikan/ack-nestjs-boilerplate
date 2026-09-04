import { CountryUtil } from '@modules/country/utils/country.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [CountryUtil],
    exports: [CountryUtil],
    imports: [],
})
export class CountryUtilModule {}

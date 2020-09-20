import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CountrySchema } from 'components/country/country.model';
import { CountryService } from 'components/country/country.service';
import { CountryController } from 'components/country/country.controller';
import { ErrorModule } from 'components/error/error.module';
import { ResponseModule } from 'common/response/response.module';
import { LanguageModule } from 'components/language/language.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'country', schema: CountrySchema }]),
        ErrorModule,
        ResponseModule,
        LanguageModule,
    ],
    exports: [CountryService],
    providers: [CountryService],
    controllers: [CountryController],
})
export class CountryModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CountrySchema } from 'country/country.model';
import { CountryService } from 'country/country.service';
import { CountryController } from 'country/country.controller';
import { ErrorModule } from 'error/error.module';
import { ResponseModule } from 'helper/response/response.module';
import { LanguageModule } from 'language/language.module';

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

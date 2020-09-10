import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CountrySchema } from 'country/country.model';
import { CountryService } from 'country/country.service';
import { CountryController } from 'country/country.controller';
import { ErrorModule } from 'error/error.module';
import { HelperModule } from 'helper/helper.module';
import { LanguageModule } from 'language/language.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'country', schema: CountrySchema }]),
        ErrorModule,
        HelperModule,
        LanguageModule,
    ],
    exports: [CountryService],
    providers: [CountryService],
    controllers: [CountryController],
})
export class CountryModule {}

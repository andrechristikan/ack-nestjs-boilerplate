import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CountrySchema } from 'country/country.model';
import { CountryService } from 'country/country.service';
import { CountryController } from 'country/country.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'country', schema: CountrySchema }]),
    ],
    exports: [CountryService],
    providers: [CountryService],
    controllers: [CountryController],
})
export class CountryModule {}

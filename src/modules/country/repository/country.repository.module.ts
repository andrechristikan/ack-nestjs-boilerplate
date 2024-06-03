import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    CountryEntity,
    CountrySchema,
} from 'src/modules/country/repository/entities/country.entity';
import { CountryRepository } from 'src/modules/country/repository/repositories/country.repository';

@Module({
    providers: [CountryRepository],
    exports: [CountryRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: CountryEntity.name,
                    schema: CountrySchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class CountryRepositoryModule {}

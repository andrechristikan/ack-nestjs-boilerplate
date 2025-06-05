import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from '@common/database/constants/database.constant';
import {
    CountryEntity,
    CountrySchema,
} from '@modules/country/repository/entities/country.entity';
import { CountryRepository } from '@modules/country/repository/repositories/country.repository';

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

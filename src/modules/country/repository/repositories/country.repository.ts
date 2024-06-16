import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/repositories/database.mongo.uuid.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    CountryDoc,
    CountryEntity,
} from 'src/modules/country/repository/entities/country.entity';

@Injectable()
export class CountryRepository extends DatabaseMongoUUIDRepositoryAbstract<
    CountryEntity,
    CountryDoc
> {
    constructor(
        @DatabaseModel(CountryEntity.name)
        private readonly countryModel: Model<CountryEntity>
    ) {
        super(countryModel);
    }
}

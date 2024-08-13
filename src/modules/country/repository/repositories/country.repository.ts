import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseRepositoryAbstract } from 'src/common/database/abstracts/database.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    CountryDoc,
    CountryEntity,
} from 'src/modules/country/repository/entities/country.entity';

@Injectable()
export class CountryRepository extends DatabaseRepositoryAbstract<
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

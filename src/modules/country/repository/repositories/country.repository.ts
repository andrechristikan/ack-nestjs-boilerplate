import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseRepositoryBase } from 'src/common/database/bases/database.repository';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    CountryDoc,
    CountryEntity,
} from 'src/modules/country/repository/entities/country.entity';

@Injectable()
export class CountryRepository extends DatabaseRepositoryBase<
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

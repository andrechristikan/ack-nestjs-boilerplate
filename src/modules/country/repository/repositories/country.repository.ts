import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from 'src/common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from 'src/common/database/decorators/database.decorator';
import {
    CountryDoc,
    CountryEntity,
} from 'src/modules/country/repository/entities/country.entity';

@Injectable()
export class CountryRepository extends DatabaseUUIDRepositoryBase<
    CountryEntity,
    CountryDoc
> {
    constructor(
        @InjectDatabaseModel(CountryEntity.name)
        private readonly countryModel: Model<CountryEntity>
    ) {
        super(countryModel);
    }
}

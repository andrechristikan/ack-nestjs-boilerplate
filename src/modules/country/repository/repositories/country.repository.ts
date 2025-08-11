import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import { CountryEntity } from '@modules/country/repository/entities/country.entity';
import { DatabaseRepositoryBase } from '@common/database/bases/database.repository';

@Injectable()
export class CountryRepository extends DatabaseRepositoryBase<CountryEntity> {
    constructor(
        @InjectDatabaseModel(CountryEntity.name)
        private readonly countryModel: Model<CountryEntity>
    ) {
        super(countryModel);
    }

    async findOneByAlpha2Code(
        alpha2Code: string
    ): Promise<CountryEntity | null> {
        return this.findOne({
            where: { alpha2Code },
        });
    }
}

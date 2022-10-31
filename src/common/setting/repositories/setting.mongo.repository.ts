import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { SettingEntity } from 'src/common/setting/schemas/setting.schema';

@Injectable()
export class SettingMongoRepository
    extends DatabaseMongoRepositoryAbstract<SettingEntity>
    implements IDatabaseRepository<SettingEntity>
{
    constructor(
        @DatabaseModel(SettingEntity.name)
        private readonly settingModel: Model<SettingEntity>
    ) {
        super(settingModel);
    }
}

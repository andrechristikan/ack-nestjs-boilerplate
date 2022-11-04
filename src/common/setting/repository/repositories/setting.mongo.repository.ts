import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseMongoModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
import { SettingMongoEntity } from 'src/common/setting/repository/entities/setting.mongo.entity';
@Injectable()
export class SettingMongoRepository
    extends DatabaseMongoRepositoryAbstract<SettingMongoEntity>
    implements IDatabaseRepository<SettingMongoEntity>
{
    constructor(
        @DatabaseMongoModel(SettingEntity)
        private readonly settingModel: Model<SettingMongoEntity>
    ) {
        super(settingModel);
    }
}

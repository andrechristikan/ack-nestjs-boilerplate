import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoUUIDRepositoryAbstract } from 'src/common/database/abstracts/mongo/repositories/database.mongo.uuid.repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';

@Injectable()
export class SettingRepository extends DatabaseMongoUUIDRepositoryAbstract<SettingEntity> {
    constructor(
        @DatabaseModel(SettingEntity.name)
        private readonly settingModel: Model<SettingEntity>
    ) {
        super(settingModel);
    }
}

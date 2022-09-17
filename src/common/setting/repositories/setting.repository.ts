import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepositoryAbstract } from 'src/common/database/interfaces/database.repository.interface';
import {
    SettingDocument,
    SettingEntity,
} from 'src/common/setting/schemas/setting.schema';

@Injectable()
export class SettingRepository
    extends DatabaseMongoRepositoryAbstract<SettingDocument>
    implements IDatabaseRepositoryAbstract<SettingDocument>
{
    constructor(
        @DatabaseEntity(SettingEntity.name)
        private readonly settingModel: Model<SettingDocument>
    ) {
        super(settingModel);
    }
}

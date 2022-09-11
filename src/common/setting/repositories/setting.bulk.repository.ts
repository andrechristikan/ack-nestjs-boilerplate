import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoBulkRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-bulk-repository.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { IDatabaseBulkRepositoryAbstract } from 'src/common/database/interfaces/database.bulk.repository.interface';
import {
    SettingDocument,
    SettingEntity,
} from 'src/common/setting/schemas/setting.schema';

@Injectable()
export class SettingBulkRepository
    extends DatabaseMongoBulkRepositoryAbstract<SettingDocument>
    implements IDatabaseBulkRepositoryAbstract
{
    constructor(
        @DatabaseEntity(SettingEntity.name)
        private readonly settingModel: Model<SettingDocument>
    ) {
        super(settingModel);
    }
}

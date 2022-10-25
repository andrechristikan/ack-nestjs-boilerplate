import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoBulkRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-bulk-repository.abstract';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import { IDatabaseBulkRepositoryAbstract } from 'src/common/database/interfaces/database.bulk.repository.interface';
import {
    Setting,
    SettingEntity,
} from 'src/common/setting/schemas/setting.schema';

@Injectable()
export class SettingBulkRepository
    extends DatabaseMongoBulkRepositoryAbstract<Setting>
    implements IDatabaseBulkRepositoryAbstract
{
    constructor(
        @DatabaseRepository(SettingEntity.name)
        private readonly settingModel: Model<Setting>
    ) {
        super(settingModel);
    }
}

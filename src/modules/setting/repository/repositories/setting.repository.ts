import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    SettingDoc,
    SettingEntity,
} from '@modules/setting/repository/entities/setting.entity';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';

@Injectable()
export class SettingRepository<TValue = any> extends DatabaseUUIDRepositoryBase<
    SettingEntity<TValue>,
    SettingDoc
> {
    constructor(
        @InjectDatabaseModel(SettingEntity.name)
        private readonly settingModel: Model<SettingEntity<TValue>>
    ) {
        super(settingModel);
    }
}

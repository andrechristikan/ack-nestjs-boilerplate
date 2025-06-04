import { InjectDatabaseModel } from '@app/common/database/decorators/database.decorator';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    SettingDoc,
    SettingEntity,
} from '@modules/setting/repository/entities/setting.entity';
import { DatabaseRepositoryBase } from '@common/database/bases/database.repository';

@Injectable()
export class SettingRepository<TValue = any> extends DatabaseRepositoryBase<
    SettingEntity<TValue>,
    SettingDoc
> {
    constructor(
        @InjectDatabaseModel(SettingEntity.name)
        private readonly settingModel: Model<SettingEntity<TValue>>
    ) {
        super(settingModel)
    }
}
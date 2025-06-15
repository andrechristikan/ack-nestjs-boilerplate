import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseUUIDRepositoryBase } from '@common/database/bases/database.uuid.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import {
    SettingFeatureDoc,
    SettingFeatureEntity,
} from '@modules/setting/repository/entities/setting-feature.entity';

@Injectable()
export class SettingFeatureRepository extends DatabaseUUIDRepositoryBase<
    SettingFeatureEntity,
    SettingFeatureDoc
> {
    constructor(
        @InjectDatabaseModel(SettingFeatureEntity.name)
        private readonly settingFeatureModel: Model<SettingFeatureEntity>
    ) {
        super(settingFeatureModel);
    }
}

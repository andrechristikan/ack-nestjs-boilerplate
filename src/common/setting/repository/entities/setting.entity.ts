import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/database.mongo-uuid-entity.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';

export const SettingDatabaseName = 'settings';

@DatabaseEntity({ collection: SettingDatabaseName })
export class SettingEntity extends DatabaseMongoUUIDEntityAbstract {
    @Prop({
        required: true,
        index: true,
        unique: true,
        trim: true,
        type: String,
    })
    name: string;

    @Prop({
        required: false,
        type: String,
    })
    description?: string;

    @Prop({
        required: false,
        type: String,
        enum: ENUM_SETTING_DATA_TYPE,
    })
    type: ENUM_SETTING_DATA_TYPE;

    @Prop({
        required: true,
        trim: true,
        type: String,
    })
    value: string;
}

export const SettingSchema = SchemaFactory.createForClass(SettingEntity);

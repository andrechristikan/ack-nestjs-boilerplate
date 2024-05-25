import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { ENUM_SETTING_DATA_TYPE } from 'src/modules/setting/constants/setting.enum.constant';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';

export const SettingDatabaseName = 'settings';

@DatabaseEntity({ collection: SettingDatabaseName })
export class SettingEntity extends DatabaseMongoUUIDEntityAbstract {
    @DatabaseProp({
        required: true,
        index: true,
        unique: true,
        trim: true,
        type: String,
    })
    name: string;

    @DatabaseProp({
        required: false,
        type: String,
    })
    description?: string;

    @DatabaseProp({
        required: false,
        type: String,
        enum: ENUM_SETTING_DATA_TYPE,
    })
    type: ENUM_SETTING_DATA_TYPE;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
    })
    value: string;
}

export const SettingSchema = DatabaseSchema(SettingEntity);
export type SettingDoc = IDatabaseDocument<SettingEntity>;

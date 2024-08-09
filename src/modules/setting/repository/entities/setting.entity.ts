import { DatabaseEntityAbstract } from 'src/common/database/abstracts/database.entity.abstract';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { ENUM_SETTING_DATA_TYPE } from 'src/modules/setting/enums/setting.enum';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';

export const SettingTableName = 'Settings';

@DatabaseEntity({ collection: SettingTableName })
export class SettingEntity extends DatabaseEntityAbstract {
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

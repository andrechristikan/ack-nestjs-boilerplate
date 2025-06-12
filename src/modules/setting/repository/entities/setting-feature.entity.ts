import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import { DatabaseUUIDEntityBase } from '@common/database/bases/database.uuid.entity';
import { SettingJson } from '@modules/setting/interfaces/setting.interface';
import { Schema } from 'mongoose';

export const SettingFeatureTableName = 'SettingFeatures';

@DatabaseEntity({
    collection: SettingFeatureTableName,
})
export class SettingFeatureEntity extends DatabaseUUIDEntityBase {
    @DatabaseProp({ required: true, unique: true, index: true })
    key: string;

    @DatabaseProp({ type: String, required: true })
    description: string;

    @DatabaseProp({
        _id: false,
        type: {
            enabled: { type: Boolean, default: false },
            additionalProperties: {
                type: Schema.Types.Mixed,
            },
        },
        required: true,
    })
    value: SettingJson;
}

export const SettingFeatureSchema = DatabaseSchema(SettingFeatureEntity);
export type SettingFeatureDoc = IDatabaseDocument<SettingFeatureEntity>;

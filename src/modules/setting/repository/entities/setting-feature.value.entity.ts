import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { SettingValue } from '@modules/setting/interfaces/setting.interface';
import { Schema } from 'mongoose';

@DatabaseEntity({ timestamps: false, _id: false })
export class SettingFeatureValueEntity {
    @DatabaseProp({
        required: true,
        default: false,
        type: Boolean,
    })
    enabled: boolean;
    @DatabaseProp({
        required: true,
        type: Schema.Types.Mixed,
    })
    properties: SettingValue;
}

export const SettingFeatureValueSchema = DatabaseSchema(
    SettingFeatureValueEntity
);

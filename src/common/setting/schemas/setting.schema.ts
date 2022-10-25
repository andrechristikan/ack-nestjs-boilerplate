import { Schema as MongooseSchema } from 'mongoose';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabasePropPrimary,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import {
    DatabaseKeyType,
    DatabaseSchemaType,
} from 'src/common/database/interfaces/database.interface';

@DatabaseEntity({ timestamps: true, versionKey: false })
export class SettingEntity {
    @DatabasePropPrimary()
    _id?: DatabaseKeyType;

    @DatabaseProp({
        required: true,
        index: true,
        unique: true,
        trim: true,
    })
    name: string;

    @DatabaseProp({
        required: false,
    })
    description?: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: MongooseSchema.Types.Mixed,
    })
    value: string | number | boolean;
}

export const SettingDatabaseName = 'settings';

export const Setting = DatabaseSchema(SettingEntity);
export type Setting = DatabaseSchemaType<SettingEntity>;

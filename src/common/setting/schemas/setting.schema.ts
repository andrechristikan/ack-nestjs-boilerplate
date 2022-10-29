import {
    DatabaseEntity,
    DatabaseHookBeforeSave,
    DatabaseProp,
    DatabasePropPrimary,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseSchema } from 'src/common/database/interfaces/database.interface';

@DatabaseEntity()
export class SettingEntity {
    @DatabasePropPrimary()
    _id?: string;

    @DatabaseProp({
        required: true,
        index: true,
        unique: true,
        type: String,
    })
    name: string;

    @DatabaseProp({
        required: false,
        type: String,
    })
    description?: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    value: string;

    @DatabaseHookBeforeSave()
    hookBeforeSave?() {
        this.name = this.name.trim();
        this.value = this.value.trim();
    }
}

export const SettingDatabaseName = 'settings';

export const SettingSchema = DatabaseSchema(SettingEntity);
export type Setting = IDatabaseSchema<SettingEntity>;

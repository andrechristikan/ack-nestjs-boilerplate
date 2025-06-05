import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import { DatabaseUUIDEntityBase } from '@common/database/bases/database.uuid.entity';

export const SettingTableName = 'Settings';

export interface SettingAdvancedValue {
    enabled: boolean;

    [key: string]: any;
}

@DatabaseEntity({
    collection: SettingTableName,
})
export class SettingEntity<T = any> extends DatabaseUUIDEntityBase {
    @DatabaseProp({ required: true, unique: true })
    key: string;

    @DatabaseProp({ type: String })
    description: string;

    @DatabaseProp({ type: Object })
    value: T;
}

export const SettingSchema = DatabaseSchema(SettingEntity);
export type SettingDoc = IDatabaseDocument<SettingEntity>;

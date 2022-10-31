import { DatabaseEntity } from 'src/common/database/schemas/database.schema';
import { ISettingEntity } from 'src/common/setting/interfaces/setting.interface';

export class SettingEntity extends DatabaseEntity implements ISettingEntity {
    name: string;
    description?: string;
    value: string;
}

export const SettingDatabaseName = 'settings';

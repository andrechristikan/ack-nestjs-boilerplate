import { DatabaseEntityAbstract } from 'src/common/database/abstracts/database.entity.repository';

export const SettingDatabaseName = 'settings';
export const SettingRepositoryName = 'SettingRepository';

export class SettingEntity extends DatabaseEntityAbstract {
    name: string;
    description?: string;
    value: string;
}

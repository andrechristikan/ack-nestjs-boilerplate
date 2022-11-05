import { DatabaseEntityAbstract } from 'src/common/database/abstracts/database.entity.repository';

export const SettingDatabaseName = 'settings';
export const SettingRepository = 'SettingRepositoryToken';

export class SettingEntity extends DatabaseEntityAbstract {
    name: string;
    description?: string;
    value: string;
}

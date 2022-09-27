import { IDatabaseSoftDeleteOptions } from 'src/common/database/interfaces/database.interface';

export interface ISettingBulkService {
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<boolean>;
}

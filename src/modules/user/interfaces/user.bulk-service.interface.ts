import { IDatabaseDeleteOptions } from 'src/common/database/interfaces/database.interface';

export interface IUserBulkService {
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteOptions
    ): Promise<boolean>;
}

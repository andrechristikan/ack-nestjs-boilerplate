import { IDatabaseOptions } from 'src/common/database/interfaces/database.interface';

export interface IAuthApiBulkService {
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<boolean>;
}

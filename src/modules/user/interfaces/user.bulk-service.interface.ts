import { IDatabaseManyOptions } from 'src/common/database/interfaces/database.interface';

export interface IUserBulkService {
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;
}

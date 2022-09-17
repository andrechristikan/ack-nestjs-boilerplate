import { IAuthPermission } from 'src/common/auth/interfaces/auth.interface';
import { IDatabaseOptions } from 'src/common/database/interfaces/database.interface';

export interface IPermissionBulkService {
    createMany(
        data: IAuthPermission[],
        options?: IDatabaseOptions
    ): Promise<boolean>;

    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<boolean>;
}

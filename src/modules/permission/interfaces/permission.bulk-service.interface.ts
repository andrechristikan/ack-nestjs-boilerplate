import { IAuthPermission } from 'src/common/auth/interfaces/auth.interface';
import {
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';

export interface IPermissionBulkService {
    createMany(
        data: IAuthPermission[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;

    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;
}

import {
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';

export interface IPermissionBulkService {
    createMany(
        data: PermissionEntity[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;

    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;
}

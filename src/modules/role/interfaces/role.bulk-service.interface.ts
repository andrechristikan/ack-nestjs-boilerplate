import {
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';

export interface IRoleBulkService {
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;

    createMany(
        data: RoleEntity[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;
}

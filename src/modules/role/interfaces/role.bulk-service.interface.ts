import {
    IDatabaseCreateManyOptions,
    IDatabaseDeleteOptions,
} from 'src/common/database/interfaces/database.interface';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';

export interface IRoleBulkService {
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteOptions
    ): Promise<boolean>;

    createMany(
        data: RoleCreateDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;
}

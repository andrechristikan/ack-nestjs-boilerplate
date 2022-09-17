import { IDatabaseOptions } from 'src/common/database/interfaces/database.interface';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';

export interface IRoleBulkService {
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<boolean>;

    createMany(
        data: RoleCreateDto[],
        options?: IDatabaseOptions
    ): Promise<boolean>;
}

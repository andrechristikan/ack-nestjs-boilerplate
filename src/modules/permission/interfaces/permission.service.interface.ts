import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { PermissionUpdateDto } from 'src/modules/permission/dtos/permission.update.dto';
import { Permission } from 'src/modules/permission/schemas/permission.schema';

export interface IPermissionService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<Permission[]>;

    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<Permission>;

    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<Permission>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<Permission>;

    create(
        data: PermissionCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<Permission>;

    update(
        _id: string,
        data: PermissionUpdateDto,
        options?: IDatabaseOptions
    ): Promise<Permission>;

    inactive(_id: string, options?: IDatabaseOptions): Promise<Permission>;

    active(_id: string, options?: IDatabaseOptions): Promise<Permission>;
}

import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleUpdateDto } from 'src/modules/role/dtos/role.update.dto';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';

export interface IRoleService {
    findAll<T>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<T[]>;

    findOneById<T>(_id: string, options?: IDatabaseFindOneOptions): Promise<T>;

    findOne<T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    exists(name: string, options?: IDatabaseExistOptions): Promise<boolean>;

    create(
        data: RoleCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<RoleEntity>;

    createSuperAdmin(options?: IDatabaseCreateOptions): Promise<RoleEntity>;

    update(
        _id: string,
        data: RoleUpdateDto,
        options?: IDatabaseOptions
    ): Promise<RoleEntity>;

    inactive(_id: string, options?: IDatabaseOptions): Promise<RoleEntity>;

    active(_id: string, options?: IDatabaseOptions): Promise<RoleEntity>;

    deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<RoleEntity>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<RoleEntity>;
}

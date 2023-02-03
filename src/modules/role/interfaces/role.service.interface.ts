import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseManyOptions,
    IDatabaseCreateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleUpdateNameDto } from 'src/modules/role/dtos/role.update-name.dto';
import { RoleUpdatePermissionDto } from 'src/modules/role/dtos/role.update-permission.dto';
import { IRoleEntity } from 'src/modules/role/interfaces/role.interface';
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

    existByName(
        name: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;

    create(
        data: RoleCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<RoleEntity>;

    createSuperAdmin(options?: IDatabaseCreateOptions): Promise<RoleEntity>;

    updateName(
        _id: string,
        data: RoleUpdateNameDto,
        options?: IDatabaseOptions
    ): Promise<RoleEntity>;

    updatePermission(
        _id: string,
        data: RoleUpdatePermissionDto,
        options?: IDatabaseOptions
    ): Promise<RoleEntity>;

    active(_id: string, options?: IDatabaseOptions): Promise<RoleEntity>;

    inactive(_id: string, options?: IDatabaseOptions): Promise<RoleEntity>;

    deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<RoleEntity>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<RoleEntity>;

    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;

    createMany(
        data: RoleCreateDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;

    getPermissionByGroup(
        role: IRoleEntity,
        scope: ENUM_PERMISSION_GROUP[]
    ): Promise<PermissionEntity[]>;
}

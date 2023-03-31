import {
    IDatabaseCreateOptions,
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
import {
    RoleDoc,
    RoleEntity,
} from 'src/modules/role/repository/entities/role.entity';

export interface IRoleService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleEntity[]>;

    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc>;

    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc>;

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

    updateName(repository: RoleDoc, data: RoleUpdateNameDto): Promise<RoleDoc>;

    updatePermission(
        repository: RoleDoc,
        data: RoleUpdatePermissionDto
    ): Promise<RoleDoc>;

    active(repository: RoleDoc): Promise<RoleDoc>;

    inactive(repository: RoleDoc): Promise<RoleDoc>;

    delete(repository: RoleDoc): Promise<RoleDoc>;

    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;

    createMany(
        data: RoleCreateDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;

    getPermissionByGroup(
        permissions: PermissionEntity[],
        scope: ENUM_PERMISSION_GROUP[]
    ): Promise<PermissionEntity[]>;

    getAccessFor(): Promise<string[]>;
}

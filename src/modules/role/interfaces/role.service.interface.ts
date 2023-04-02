import {
    IDatabaseCreateOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseManyOptions,
    IDatabaseCreateManyOptions,
} from 'src/common/database/interfaces/database.interface';
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

    findOneById<T>(_id: string, options?: IDatabaseFindOneOptions): Promise<T>;

    findOne<T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T>;

    findOneByName<T>(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    exist(_id: string, options?: IDatabaseExistOptions): Promise<boolean>;

    existByName(
        name: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;

    create(
        { accessFor, name }: RoleCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<RoleDoc>;

    createSuperAdmin(options?: IDatabaseCreateOptions): Promise<RoleDoc>;

    updateName(
        repository: RoleDoc,
        { name }: RoleUpdateNameDto
    ): Promise<RoleDoc>;

    updatePermission(
        repository: RoleDoc,
        { accessFor }: RoleUpdatePermissionDto
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

    getAccessFor(): Promise<string[]>;
}

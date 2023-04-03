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
import { RoleUpdatePermissionDto } from 'src/modules/role/dtos/role.update-permission.dto';
import { RoleUpdateDto } from 'src/modules/role/dtos/role.update.dto';
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

    findOneByName(
        name: string,
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
        { name, description, type, permissions }: RoleCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<RoleDoc>;

    update(
        repository: RoleDoc,
        { description }: RoleUpdateDto
    ): Promise<RoleDoc>;

    updatePermissions(
        repository: RoleDoc,
        { permissions }: RoleUpdatePermissionDto
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
}

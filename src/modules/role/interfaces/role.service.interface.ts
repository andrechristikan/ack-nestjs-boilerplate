import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { RoleActiveDto } from 'src/modules/role/dtos/role.active.dto';
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
        data: RoleEntity,
        options?: IDatabaseCreateOptions
    ): Promise<RoleEntity>;

    update(
        _id: string,
        data: RoleUpdateDto,
        options?: IDatabaseOptions
    ): Promise<RoleEntity>;

    updateIsActive(
        _id: string,
        data: RoleActiveDto,
        options?: IDatabaseOptions
    ): Promise<RoleEntity>;

    deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<RoleEntity>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<RoleEntity>;
}

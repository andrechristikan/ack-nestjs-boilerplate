import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { PermissionUpdateGroupDto } from 'src/modules/permission/dtos/permission.update-group.dto';
import { PermissionUpdateDto } from 'src/modules/permission/dtos/permission.update.dto';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';

export interface IPermissionService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionEntity[]>;

    findAllByGroup(
        groups?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionEntity[]>;

    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<PermissionEntity>;

    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<PermissionEntity>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<PermissionEntity>;

    create(
        data: PermissionCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<PermissionEntity>;

    update(
        _id: string,
        data: PermissionUpdateDto,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity>;

    updateGroup(
        _id: string,
        data: PermissionUpdateGroupDto,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity>;

    inactive(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity>;

    active(_id: string, options?: IDatabaseOptions): Promise<PermissionEntity>;
}

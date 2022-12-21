import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { PermissionUpdateGroupDto } from 'src/modules/permission/dtos/permission.update-group.dto';
import { PermissionUpdateDescriptionDto } from 'src/modules/permission/dtos/permission.update-description.dto';
import { IPermissionGroup } from 'src/modules/permission/interfaces/permission.interface';
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

    updateDescription(
        _id: string,
        data: PermissionUpdateDescriptionDto,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity>;

    updateGroup(
        _id: string,
        data: PermissionUpdateGroupDto,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity>;

    active(_id: string, options?: IDatabaseOptions): Promise<PermissionEntity>;

    inactive(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity>;

    groupingByGroups(
        permissions: PermissionEntity[]
    ): Promise<IPermissionGroup[]>;

    createMany(
        data: PermissionCreateDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;

    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;
}

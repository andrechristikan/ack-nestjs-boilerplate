import {
    IDatabaseCreateOptions,
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
import {
    PermissionDoc,
    PermissionEntity,
} from 'src/modules/permission/repository/entities/permission.entity';

export interface IPermissionService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionEntity[]>;

    findAllByGroup(
        filterGroups?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionEntity[]>;

    findAllByIds(
        ids: string[],
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionEntity[]>;

    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<PermissionDoc>;

    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<PermissionDoc>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    delete(repository: PermissionDoc): Promise<PermissionDoc>;

    create(
        data: PermissionCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<PermissionEntity>;

    updateDescription(
        repository: PermissionDoc,
        data: PermissionUpdateDescriptionDto
    ): Promise<PermissionDoc>;

    updateGroup(
        repository: PermissionDoc,
        data: PermissionUpdateGroupDto
    ): Promise<PermissionDoc>;

    active(repository: PermissionDoc): Promise<PermissionDoc>;

    inactive(repository: PermissionDoc): Promise<PermissionDoc>;

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

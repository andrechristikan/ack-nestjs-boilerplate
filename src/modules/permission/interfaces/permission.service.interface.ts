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
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';

export interface IPermissionService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionEntity[]>;

    findAllByIds(
        ids: string[],
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionDoc[]>;

    findAllByGroup(
        filterGroups?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionDoc[]>;

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
        { group, code, description }: PermissionCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<PermissionDoc>;

    updateDescription(
        repository: PermissionDoc,
        { description }: PermissionUpdateDescriptionDto
    ): Promise<PermissionDoc>;

    updateGroup(
        repository: PermissionDoc,
        { group }: PermissionUpdateGroupDto
    ): Promise<PermissionDoc>;

    active(repository: PermissionDoc): Promise<PermissionDoc>;

    inactive(repository: PermissionDoc): Promise<PermissionDoc>;

    groupingByGroups(
        permissions: PermissionDoc[],
        scope?: ENUM_PERMISSION_GROUP[]
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

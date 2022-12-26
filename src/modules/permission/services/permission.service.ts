import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_PAGINATION_SORT_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PermissionActiveDto } from 'src/modules/permission/dtos/permission.active.dto';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { PermissionUpdateDescriptionDto } from 'src/modules/permission/dtos/permission.update-description.dto';
import { PermissionUpdateGroupDto } from 'src/modules/permission/dtos/permission.update-group.dto';
import { IPermissionGroup } from 'src/modules/permission/interfaces/permission.interface';
import { IPermissionService } from 'src/modules/permission/interfaces/permission.service.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { PermissionRepository } from 'src/modules/permission/repository/repositories/permission.repository';

@Injectable()
export class PermissionService implements IPermissionService {
    constructor(private readonly permissionRepository: PermissionRepository) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionEntity[]> {
        return this.permissionRepository.findAll<PermissionEntity>(
            find,
            options
        );
    }

    async findAllByGroup(
        groups?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionEntity[]> {
        return this.permissionRepository.findAll<PermissionEntity>(
            { ...groups },
            { ...options, sort: { group: ENUM_PAGINATION_SORT_TYPE.ASC } }
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<PermissionEntity> {
        return this.permissionRepository.findOneById<PermissionEntity>(
            _id,
            options
        );
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<PermissionEntity> {
        return this.permissionRepository.findOne<PermissionEntity>(
            find,
            options
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number> {
        return this.permissionRepository.getTotal(find, options);
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<PermissionEntity> {
        return this.permissionRepository.deleteOne(find, options);
    }

    async create(
        { group, code, description }: PermissionCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<PermissionEntity> {
        const create: PermissionEntity = new PermissionEntity();
        create.group = group;
        create.code = code;
        create.description = description ?? undefined;
        create.isActive = true;

        return this.permissionRepository.create<PermissionEntity>(
            create,
            options
        );
    }

    async updateDescription(
        _id: string,
        data: PermissionUpdateDescriptionDto,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity> {
        return this.permissionRepository.updateOneById<PermissionUpdateDescriptionDto>(
            _id,
            data,
            options
        );
    }

    async updateGroup(
        _id: string,
        data: PermissionUpdateGroupDto,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity> {
        return this.permissionRepository.updateOneById<PermissionUpdateGroupDto>(
            _id,
            data,
            options
        );
    }

    async active(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity> {
        const dto: PermissionActiveDto = new PermissionActiveDto();
        dto.isActive = true;

        return this.permissionRepository.updateOneById<PermissionActiveDto>(
            _id,
            dto,
            options
        );
    }

    async inactive(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity> {
        const dto: PermissionActiveDto = new PermissionActiveDto();
        dto.isActive = false;

        return this.permissionRepository.updateOneById<PermissionActiveDto>(
            _id,
            dto,
            options
        );
    }

    async groupingByGroups(
        permissions: PermissionEntity[]
    ): Promise<IPermissionGroup[]> {
        return Object.values(ENUM_PERMISSION_GROUP)
            .map((val) => {
                const pms: PermissionEntity[] = permissions.filter(
                    (l) => l.group === val
                );

                return {
                    group: val,
                    permissions: pms,
                };
            })
            .filter((val) => val.permissions.length !== 0);
    }

    async createMany(
        data: PermissionCreateDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        const create: PermissionEntity[] = data.map((val) => {
            const entity: PermissionEntity = new PermissionEntity();
            entity.code = val.code;
            entity.description = val?.description;
            entity.group = val.group;
            entity.isActive = true;

            return entity;
        }) as PermissionEntity[];

        return this.permissionRepository.createMany<PermissionEntity>(
            create,
            options
        );
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.permissionRepository.deleteMany(find, options);
    }
}

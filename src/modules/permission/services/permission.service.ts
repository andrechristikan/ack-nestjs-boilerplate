import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { PermissionUpdateDescriptionDto } from 'src/modules/permission/dtos/permission.update-description.dto';
import { PermissionUpdateGroupDto } from 'src/modules/permission/dtos/permission.update-group.dto';
import { IPermissionGroup } from 'src/modules/permission/interfaces/permission.interface';
import { IPermissionService } from 'src/modules/permission/interfaces/permission.service.interface';
import {
    PermissionDoc,
    PermissionEntity,
} from 'src/modules/permission/repository/entities/permission.entity';
import { PermissionRepository } from 'src/modules/permission/repository/repositories/permission.repository';

@Injectable()
export class PermissionService implements IPermissionService {
    constructor(private readonly permissionRepository: PermissionRepository) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionDoc[]> {
        return this.permissionRepository.findAll<PermissionDoc>(find, options);
    }

    async findAllByGroup(
        groups?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionDoc[]> {
        return this.permissionRepository.findAll<PermissionDoc>(
            { ...groups },
            {
                ...options,
                order: { group: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC },
            }
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<PermissionDoc> {
        return this.permissionRepository.findOneById<PermissionDoc>(
            _id,
            options
        );
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<PermissionDoc> {
        return this.permissionRepository.findOne<PermissionDoc>(find, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number> {
        return this.permissionRepository.getTotal(find, options);
    }

    async delete(repository: PermissionDoc): Promise<PermissionDoc> {
        return this.permissionRepository.softDelete(repository);
    }

    async create(
        { group, code, description }: PermissionCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<PermissionDoc> {
        const create: PermissionEntity = new PermissionEntity();
        create.group = group;
        create.code = code;
        create.description = description ?? undefined;
        create.isActive = true;

        return this.permissionRepository.create<PermissionDoc>(create, options);
    }

    async updateDescription(
        repository: PermissionDoc,
        { description }: PermissionUpdateDescriptionDto
    ): Promise<PermissionDoc> {
        repository.description = description;

        return this.permissionRepository.save(repository);
    }

    async updateGroup(
        repository: PermissionDoc,
        { group }: PermissionUpdateGroupDto
    ): Promise<PermissionDoc> {
        repository.group = group;

        return this.permissionRepository.save(repository);
    }

    async active(repository: PermissionDoc): Promise<PermissionDoc> {
        repository.isActive = true;
        return this.permissionRepository.save(repository);
    }

    async inactive(repository: PermissionDoc): Promise<PermissionDoc> {
        repository.isActive = false;

        return this.permissionRepository.save(repository);
    }

    async groupingByGroups(
        permissions: PermissionDoc[]
    ): Promise<IPermissionGroup[]> {
        return Object.values(ENUM_PERMISSION_GROUP)
            .map((val) => {
                const pms: PermissionDoc[] = permissions.filter(
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

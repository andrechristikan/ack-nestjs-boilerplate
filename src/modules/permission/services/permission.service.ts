import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_PAGINATION_SORT_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { PermissionActiveDto } from 'src/modules/permission/dtos/permission.active.dto';
import { PermissionUpdateGroupDto } from 'src/modules/permission/dtos/permission.update-group.dto';
import { PermissionUpdateDto } from 'src/modules/permission/dtos/permission.update.dto';
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
        data: PermissionEntity,
        options?: IDatabaseCreateOptions
    ): Promise<PermissionEntity> {
        return this.permissionRepository.create<PermissionEntity>(
            data,
            options
        );
    }

    async update(
        _id: string,
        data: PermissionUpdateDto,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity> {
        return this.permissionRepository.updateOneById<PermissionUpdateDto>(
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

    async updateIsActive(
        _id: string,
        data: PermissionActiveDto,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity> {
        return this.permissionRepository.updateOneById<PermissionActiveDto>(
            _id,
            data,
            options
        );
    }
}

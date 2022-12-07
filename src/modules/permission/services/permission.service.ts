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
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { PermissionUpdateGroupDto } from 'src/modules/permission/dtos/permission.update-group.dto';
import { PermissionUpdateDto } from 'src/modules/permission/dtos/permission.update.dto';
import { IPermissionService } from 'src/modules/permission/interfaces/permission.service.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { PermissionRepository } from 'src/modules/permission/repository/repositories/permission.repository';
import { PermissionUseCase } from 'src/modules/permission/use-cases/permission.use-case';

@Injectable()
export class PermissionService implements IPermissionService {
    constructor(
        private readonly permissionRepository: PermissionRepository,
        private readonly permissionUseCase: PermissionUseCase
    ) {}

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
        data: PermissionCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<PermissionEntity> {
        const create: PermissionEntity = await this.permissionUseCase.create(
            data
        );

        return this.permissionRepository.create<PermissionEntity>(
            create,
            options
        );
    }

    async update(
        _id: string,
        data: PermissionUpdateDto,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity> {
        const update: PermissionUpdateDto = await this.permissionUseCase.update(
            data
        );

        return this.permissionRepository.updateOneById<PermissionUpdateDto>(
            _id,
            update,
            options
        );
    }

    async updateGroup(
        _id: string,
        data: PermissionUpdateGroupDto,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity> {
        const update: PermissionUpdateGroupDto =
            await this.permissionUseCase.updateGroup(data);

        return this.permissionRepository.updateOneById<PermissionUpdateGroupDto>(
            _id,
            update,
            options
        );
    }

    async inactive(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity> {
        const update: PermissionActiveDto =
            await this.permissionUseCase.inactive();

        return this.permissionRepository.updateOneById<PermissionActiveDto>(
            _id,
            update,
            options
        );
    }

    async active(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<PermissionEntity> {
        const update: PermissionActiveDto =
            await this.permissionUseCase.active();

        return this.permissionRepository.updateOneById<PermissionActiveDto>(
            _id,
            update,
            options
        );
    }
}

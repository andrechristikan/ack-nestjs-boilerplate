import { Injectable } from '@nestjs/common';
import {
    IDatabaseFindAllOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { PermissionActiveDto } from 'src/modules/permission/dtos/permission.active.dto';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { PermissionUpdateDto } from 'src/modules/permission/dtos/permission.update.dto';
import { IPermissionService } from 'src/modules/permission/interfaces/permission.service.interface';
import { PermissionRepository } from 'src/modules/permission/repositories/permission.repository';
import {
    PermissionDocument,
    PermissionEntity,
} from 'src/modules/permission/schemas/permission.schema';

@Injectable()
export class PermissionService implements IPermissionService {
    constructor(private readonly permissionRepository: PermissionRepository) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionDocument[]> {
        return this.permissionRepository.findAll<PermissionDocument>(
            find,
            options
        );
    }

    async findOneById(_id: string): Promise<PermissionDocument> {
        return this.permissionRepository.findOneById<PermissionDocument>(_id);
    }

    async findOne(find: Record<string, any>): Promise<PermissionDocument> {
        return this.permissionRepository.findOne<PermissionDocument>(find);
    }

    async getTotal(find?: Record<string, any>): Promise<number> {
        return this.permissionRepository.getTotal(find);
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<PermissionDocument> {
        return this.permissionRepository.deleteOne(find, options);
    }

    async create(
        data: PermissionCreateDto,
        options?: IDatabaseOptions
    ): Promise<PermissionDocument> {
        const create: PermissionEntity = {
            ...data,
            isActive: true,
        };

        return this.permissionRepository.create<PermissionEntity>(
            create,
            options
        );
    }

    async update(
        _id: string,
        data: PermissionUpdateDto,
        options?: IDatabaseOptions
    ): Promise<PermissionDocument> {
        return this.permissionRepository.updateOneById<PermissionUpdateDto>(
            _id,
            data,
            options
        );
    }

    async inactive(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<PermissionDocument> {
        return this.permissionRepository.updateOneById<PermissionActiveDto>(
            _id,
            {
                isActive: false,
            },
            options
        );
    }

    async active(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<PermissionDocument> {
        return this.permissionRepository.updateOneById<PermissionActiveDto>(
            _id,
            {
                isActive: true,
            },
            options
        );
    }
}

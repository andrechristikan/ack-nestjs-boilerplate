import { Injectable } from '@nestjs/common';
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
import { IRoleService } from 'src/modules/role/interfaces/role.service.interface';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { RoleRepository } from 'src/modules/role/repository/repositories/role.repository';

@Injectable()
export class RoleService implements IRoleService {
    constructor(private readonly roleRepository: RoleRepository) {}

    async findAll<T>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<T[]> {
        return this.roleRepository.findAll<T>(find, options);
    }

    async findOneById<T>(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        return this.roleRepository.findOneById<T>(_id, options);
    }

    async findOne<T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        return this.roleRepository.findOne<T>(find, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number> {
        return this.roleRepository.getTotal(find, options);
    }

    async exists(
        name: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean> {
        return this.roleRepository.exists(
            {
                name,
            },
            options
        );
    }

    async create(
        data: RoleEntity,
        options?: IDatabaseCreateOptions
    ): Promise<RoleEntity> {
        return this.roleRepository.create<RoleEntity>(data, options);
    }

    async update(
        _id: string,
        data: RoleUpdateDto,
        options?: IDatabaseOptions
    ): Promise<RoleEntity> {
        return this.roleRepository.updateOneById<RoleUpdateDto>(
            _id,
            data,
            options
        );
    }

    async updateIsActive(
        _id: string,
        data: RoleActiveDto,
        options?: IDatabaseOptions
    ): Promise<RoleEntity> {
        return this.roleRepository.updateOneById<RoleActiveDto>(
            _id,
            data,
            options
        );
    }

    async deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<RoleEntity> {
        return this.roleRepository.deleteOneById(_id, options);
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<RoleEntity> {
        return this.roleRepository.deleteOne(find, options);
    }
}

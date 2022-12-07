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
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleUpdateDto } from 'src/modules/role/dtos/role.update.dto';
import { IRoleService } from 'src/modules/role/interfaces/role.service.interface';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { RoleRepository } from 'src/modules/role/repository/repositories/role.repository';
import { RoleUseCase } from 'src/modules/role/use-cases/role.use-case';

@Injectable()
export class RoleService implements IRoleService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly roleUseCase: RoleUseCase
    ) {}

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
        data: RoleCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<RoleEntity> {
        const create: RoleEntity = await this.roleUseCase.create(data);

        return this.roleRepository.create<RoleEntity>(create, options);
    }

    async createSuperAdmin(
        options?: IDatabaseCreateOptions
    ): Promise<RoleEntity> {
        const create: RoleEntity = await this.roleUseCase.createSuperAdmin();

        return this.roleRepository.create<RoleEntity>(create, options);
    }

    async update(
        _id: string,
        data: RoleUpdateDto,
        options?: IDatabaseOptions
    ): Promise<RoleEntity> {
        const update: RoleUpdateDto = await this.roleUseCase.update(data);
        return this.roleRepository.updateOneById<RoleUpdateDto>(
            _id,
            update,
            options
        );
    }

    async inactive(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<RoleEntity> {
        const update: RoleActiveDto = await this.roleUseCase.inactive();

        return this.roleRepository.updateOneById<RoleActiveDto>(
            _id,
            update,
            options
        );
    }

    async active(_id: string, options?: IDatabaseOptions): Promise<RoleEntity> {
        const update: RoleActiveDto = await this.roleUseCase.active();

        return this.roleRepository.updateOneById<RoleActiveDto>(
            _id,
            update,
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

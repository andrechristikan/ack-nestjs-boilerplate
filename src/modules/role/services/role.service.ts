import { Injectable } from '@nestjs/common';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseManyOptions,
    IDatabaseCreateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { RoleActiveDto } from 'src/modules/role/dtos/role.active.dto';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleUpdateNameDto } from 'src/modules/role/dtos/role.update-name.dto';
import { RoleUpdatePermissionDto } from 'src/modules/role/dtos/role.update-permission.dto';
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

    async existByName(
        name: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean> {
        return this.roleRepository.exists(
            {
                name,
            },
            { ...options, withDeleted: true }
        );
    }

    async create(
        { accessFor, permissions, name }: RoleCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<RoleEntity> {
        const create: RoleEntity = new RoleEntity();
        create.accessFor = accessFor;
        create.permissions = permissions;
        create.isActive = true;
        create.name = name;

        return this.roleRepository.create<RoleEntity>(create, options);
    }

    async createSuperAdmin(
        options?: IDatabaseCreateOptions
    ): Promise<RoleEntity> {
        const create: RoleEntity = new RoleEntity();
        create.name = 'superadmin';
        create.permissions = [];
        create.isActive = true;
        create.accessFor = ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN;

        return this.roleRepository.create<RoleEntity>(create, options);
    }

    async updateName(
        _id: string,
        data: RoleUpdateNameDto,
        options?: IDatabaseOptions
    ): Promise<RoleEntity> {
        return this.roleRepository.updateOneById<RoleUpdateNameDto>(
            _id,
            data,
            options
        );
    }

    async updatePermission(
        _id: string,
        data: RoleUpdatePermissionDto,
        options?: IDatabaseOptions
    ): Promise<RoleEntity> {
        return this.roleRepository.updateOneById<RoleUpdatePermissionDto>(
            _id,
            data,
            options
        );
    }

    async active(_id: string, options?: IDatabaseOptions): Promise<RoleEntity> {
        const dto: RoleActiveDto = new RoleActiveDto();
        dto.isActive = true;

        return this.roleRepository.updateOneById<RoleActiveDto>(
            _id,
            dto,
            options
        );
    }

    async inactive(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<RoleEntity> {
        const dto: RoleActiveDto = new RoleActiveDto();
        dto.isActive = false;

        return this.roleRepository.updateOneById<RoleActiveDto>(
            _id,
            dto,
            options
        );
    }

    async deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<RoleEntity> {
        return this.roleRepository.softDeleteOneById(_id, options);
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<RoleEntity> {
        return this.roleRepository.softDeleteOne(find, options);
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.roleRepository.deleteMany(find, options);
    }

    async createMany(
        data: RoleCreateDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        const create: RoleEntity[] = data.map(
            ({ accessFor, permissions, name }) => {
                const entity: RoleEntity = new RoleEntity();
                entity.accessFor = accessFor;
                entity.permissions = permissions;
                entity.isActive = true;
                entity.name = name;

                return entity;
            }
        );
        return this.roleRepository.createMany<RoleEntity>(create, options);
    }
}

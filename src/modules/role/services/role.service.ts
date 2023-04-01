import { Injectable } from '@nestjs/common';
import {
    ENUM_AUTH_ACCESS_FOR,
    ENUM_AUTH_ACCESS_FOR_DEFAULT,
} from 'src/common/auth/constants/auth.enum.constant';
import {
    IDatabaseCreateOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseManyOptions,
    IDatabaseCreateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleUpdateNameDto } from 'src/modules/role/dtos/role.update-name.dto';
import { RoleUpdatePermissionDto } from 'src/modules/role/dtos/role.update-permission.dto';
import { IRoleDoc } from 'src/modules/role/interfaces/role.interface';
import { IRoleService } from 'src/modules/role/interfaces/role.service.interface';
import {
    RoleDoc,
    RoleEntity,
} from 'src/modules/role/repository/entities/role.entity';
import { RoleRepository } from 'src/modules/role/repository/repositories/role.repository';

@Injectable()
export class RoleService implements IRoleService {
    constructor(private readonly roleRepository: RoleRepository) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleEntity[]> {
        return this.roleRepository.findAll<RoleEntity>(find, {
            ...options,
            join: false,
        });
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

    async findOneByName<T>(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        return this.roleRepository.findOne<T>({ name }, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number> {
        return this.roleRepository.getTotal(find, options);
    }

    async exist(
        _id: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean> {
        return this.roleRepository.exists(
            {
                _id,
            },
            { ...options, withDeleted: false }
        );
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
    ): Promise<RoleDoc> {
        const create: RoleEntity = new RoleEntity();
        create.accessFor = accessFor;
        create.permissions = permissions;
        create.isActive = true;
        create.name = name;

        return this.roleRepository.create<RoleEntity>(create, options);
    }

    async createSuperAdmin(options?: IDatabaseCreateOptions): Promise<RoleDoc> {
        const create: RoleEntity = new RoleEntity();
        create.name = 'superadmin';
        create.permissions = [];
        create.isActive = true;
        create.accessFor = ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN;

        return this.roleRepository.create<RoleEntity>(create, options);
    }

    async updateName(
        repository: RoleDoc,
        { name }: RoleUpdateNameDto
    ): Promise<RoleDoc> {
        repository.name = name;

        return this.roleRepository.save(repository);
    }

    async updatePermission(
        repository: RoleDoc,
        { accessFor, permissions }: RoleUpdatePermissionDto
    ): Promise<RoleDoc> {
        repository.accessFor = accessFor;
        repository.permissions = permissions;

        return this.roleRepository.save(repository);
    }

    async active(repository: RoleDoc): Promise<RoleDoc> {
        repository.isActive = true;

        return this.roleRepository.save(repository);
    }

    async inactive(repository: RoleDoc): Promise<RoleDoc> {
        repository.isActive = false;

        return this.roleRepository.save(repository);
    }

    async joinWithPermission(repository: RoleDoc): Promise<IRoleDoc> {
        return repository.populate({
            path: 'permissions',
            localField: 'permissions',
            foreignField: '_id',
            model: PermissionEntity.name,
        });
    }

    async delete(repository: RoleDoc): Promise<RoleDoc> {
        return this.roleRepository.softDelete(repository);
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

    async getAccessFor(): Promise<string[]> {
        return Object.values(ENUM_AUTH_ACCESS_FOR_DEFAULT);
    }
}

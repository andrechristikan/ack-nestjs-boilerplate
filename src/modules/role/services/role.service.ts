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
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleUpdateNameDto } from 'src/modules/role/dtos/role.update-name.dto';
import { RoleUpdatePermissionDto } from 'src/modules/role/dtos/role.update-permission.dto';
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
            returnPlain: true,
        });
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc> {
        return this.roleRepository.findOneById<RoleDoc>(_id, {
            ...options,
            returnPlain: false,
        });
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc> {
        return this.roleRepository.findOne<RoleDoc>(find, {
            ...options,
            returnPlain: false,
        });
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

        return this.roleRepository.create<RoleEntity>(create, {
            ...options,
            returnPlain: true,
        });
    }

    async createSuperAdmin(
        options?: IDatabaseCreateOptions
    ): Promise<RoleEntity> {
        const create: RoleEntity = new RoleEntity();
        create.name = 'superadmin';
        create.permissions = [];
        create.isActive = true;
        create.accessFor = ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN;

        return this.roleRepository.create<RoleEntity>(create, {
            ...options,
            returnPlain: true,
        });
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

    async getPermissionByGroup(
        permissions: PermissionEntity[],
        scope: ENUM_PERMISSION_GROUP[]
    ): Promise<PermissionEntity[]> {
        return permissions.filter((val) => scope.includes(val.group));
    }

    async getAccessFor(): Promise<string[]> {
        return Object.values(ENUM_AUTH_ACCESS_FOR_DEFAULT);
    }
}

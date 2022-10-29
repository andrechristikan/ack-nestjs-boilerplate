import { Injectable } from '@nestjs/common';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { DatabaseService } from 'src/common/database/services/database.service';
import { RoleActiveDto } from 'src/modules/role/dtos/role.active.dto';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleUpdateDto } from 'src/modules/role/dtos/role.update.dto';
import { IRoleUpdate } from 'src/modules/role/interfaces/role.interface';
import { IRoleService } from 'src/modules/role/interfaces/role.service.interface';
import { RoleRepository } from 'src/modules/role/repositories/role.repository';
import { Role, RoleEntity } from 'src/modules/role/schemas/role.schema';

@Injectable()
export class RoleService implements IRoleService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly databaseService: DatabaseService
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
                name: {
                    $regex: new RegExp(name),
                    $options: 'i',
                },
            },
            options
        );
    }

    async create(
        { name, permissions, accessFor }: RoleCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<Role> {
        const create: RoleEntity = new RoleEntity();
        create.name = name;
        create.permissions = permissions;
        create.isActive = true;
        create.accessFor = accessFor;

        return this.roleRepository.create<RoleEntity>(create, options);
    }

    async createSuperAdmin(options?: IDatabaseCreateOptions): Promise<Role> {
        const create: RoleEntity = new RoleEntity();
        create.name = 'superadmin';
        create.permissions = [];
        create.isActive = true;
        create.accessFor = ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN;

        return this.roleRepository.create<RoleEntity>(create, options);
    }

    async update(
        _id: string,
        { name, permissions, accessFor }: RoleUpdateDto,
        options?: IDatabaseOptions
    ): Promise<Role> {
        const update: IRoleUpdate = {
            name,
            accessFor,
            permissions: permissions,
        };

        return this.roleRepository.updateOneById<IRoleUpdate>(
            _id,
            update,
            options
        );
    }

    async inactive(_id: string, options?: IDatabaseOptions): Promise<Role> {
        const update: RoleActiveDto = {
            isActive: false,
        };

        return this.roleRepository.updateOneById(_id, update, options);
    }

    async active(_id: string, options?: IDatabaseOptions): Promise<Role> {
        const update: RoleActiveDto = {
            isActive: true,
        };

        return this.roleRepository.updateOneById(_id, update, options);
    }

    async deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<Role> {
        return this.roleRepository.deleteOneById(_id, options);
    }
    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<Role> {
        return this.roleRepository.deleteOne(find, options);
    }
}

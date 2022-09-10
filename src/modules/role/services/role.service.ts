import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleUpdateDto } from 'src/modules/role/dtos/role.update.dto';
import { IRoleService } from 'src/modules/role/interfaces/role.service.interface';
import { RoleRepository } from 'src/modules/role/repositories/role.repository';
import { RoleDocument, RoleEntity } from 'src/modules/role/schemas/role.schema';

@Injectable()
export class RoleService implements IRoleService {
    constructor(private readonly roleRepository: RoleRepository) {}

    async findAll<T>(
        find: Record<string, any>,
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

    async getTotal(find: Record<string, any>): Promise<number> {
        return this.roleRepository.getTotal(find);
    }

    async exists(name: string, excludeId?: string): Promise<boolean> {
        return this.roleRepository.exists(
            {
                name: {
                    $regex: new RegExp(name),
                    $options: 'i',
                },
            },
            excludeId
        );
    }

    async create(
        { name, permissions, accessFor }: RoleCreateDto,
        options?: IDatabaseOptions
    ): Promise<RoleDocument> {
        const create: RoleEntity = {
            name: name,
            permissions: permissions.map((val) => new Types.ObjectId(val)),
            isActive: true,
            accessFor,
        };

        return this.roleRepository.create<RoleEntity>(create, options);
    }

    async createSuperAdmin(options?: IDatabaseOptions): Promise<RoleDocument> {
        const create: RoleEntity = {
            name: 'superadmin',
            permissions: [],
            isActive: true,
            accessFor: ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN,
        };

        return this.roleRepository.create<RoleEntity>(create, options);
    }

    async update(
        _id: string,
        { name, permissions, accessFor }: RoleUpdateDto,
        options?: IDatabaseOptions
    ): Promise<RoleDocument> {
        const update = {
            name,
            accessFor,
            permissions: permissions.map((val) => new Types.ObjectId(val)),
        };

        return this.roleRepository.updateOneById(_id, update, options);
    }

    async inactive(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<RoleDocument> {
        return this.roleRepository.updateOneById(
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
    ): Promise<RoleDocument> {
        return this.roleRepository.updateOneById(
            _id,
            {
                isActive: true,
            },
            options
        );
    }

    async deleteOneById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<RoleDocument> {
        return this.roleRepository.deleteOneById(_id, options);
    }
    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<RoleDocument> {
        return this.roleRepository.deleteOne(find, options);
    }
}

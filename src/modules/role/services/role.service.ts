import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { RoleDocument, RoleEntity } from '../schemas/role.schema';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from 'src/common/database/database.interface';
import { PermissionEntity } from 'src/modules/permission/schemas/permission.schema';
import { RoleCreateDto } from '../dtos/role.create.dto';
import { RoleUpdateDto } from '../dtos/role.update.dto';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.constant';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';

@Injectable()
export class RoleService {
    constructor(
        @DatabaseEntity(RoleEntity.name)
        private readonly roleModel: Model<RoleDocument>
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleDocument[]> {
        const roles = this.roleModel.find(find);
        if (
            options &&
            options.limit !== undefined &&
            options.skip !== undefined
        ) {
            roles.limit(options.limit).skip(options.skip);
        }

        if (options && options.sort) {
            roles.sort(options.sort);
        }

        return roles.lean();
    }

    async getTotal(find?: Record<string, any>): Promise<number> {
        return this.roleModel.countDocuments(find);
    }

    async findOneById<T>(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        const roles = this.roleModel.findById(_id);

        if (options && options.populate && options.populate.permission) {
            roles.populate({
                path: 'permissions',
                model: PermissionEntity.name,
            });
        }

        return roles.lean();
    }

    async findOne<T>(
        find?: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        const role = this.roleModel.findOne(find);

        if (options && options.populate && options.populate.permission) {
            role.populate({
                path: 'permissions',
                model: PermissionEntity.name,
            });
        }

        return role.lean();
    }

    async exists(name: string, _id?: string): Promise<boolean> {
        const exist = await this.roleModel.exists({
            name: {
                $regex: new RegExp(name),
                $options: 'i',
            },
            _id: { $nin: new Types.ObjectId(_id) },
        });

        return exist ? true : false;
    }

    async create({
        name,
        permissions,
        accessFor,
        isActive,
    }: RoleCreateDto): Promise<RoleDocument> {
        const create: RoleDocument = new this.roleModel({
            name: name,
            permissions: permissions.map((val) => new Types.ObjectId(val)),
            isActive: isActive || true,
            accessFor,
        });

        return create.save();
    }

    async createSuperAdmin(): Promise<RoleDocument> {
        const create: RoleDocument = new this.roleModel({
            name: 'superadmin',
            permissions: [],
            isActive: true,
            accessFor: ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN,
        });

        return create.save();
    }

    async update(
        _id: string,
        { name, permissions, accessFor }: RoleUpdateDto
    ): Promise<RoleDocument> {
        const update: RoleDocument = await this.roleModel.findById(_id);
        update.name = name;
        update.accessFor = accessFor;
        update.permissions = permissions.map((val) => new Types.ObjectId(val));

        return update.save();
    }

    async inactive(_id: string): Promise<RoleDocument> {
        const role: RoleDocument = await this.roleModel.findById(_id);

        role.isActive = false;
        return role.save();
    }

    async active(_id: string): Promise<RoleDocument> {
        const role: RoleDocument = await this.roleModel.findById(_id);

        role.isActive = true;
        return role.save();
    }

    async deleteOneById(_id: string): Promise<RoleDocument> {
        return this.roleModel.findByIdAndDelete(_id);
    }
}

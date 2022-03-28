import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { DatabaseEntity } from 'src/database/database.decorator';
import { RoleCreateValidation } from '../validation/role.create.validation';
import { RoleUpdateValidation } from '../validation/role.update.validation';
import { RoleGetTransformer } from '../transformer/role.get.transformer';
import { IRoleDocument } from '../role.interface';
import { RoleListTransformer } from '../transformer/role.list.transformer';
import { RoleDocument, RoleEntity } from '../schema/role.schema';
import { PermissionEntity } from 'src/permission/schema/permission.schema';

@Injectable()
export class RoleService {
    constructor(
        @DatabaseEntity(RoleEntity.name)
        private readonly roleModel: Model<RoleDocument>
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: Record<string, any>
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
        options?: Record<string, any>
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
        options?: Record<string, any>
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
        isAdmin,
    }: RoleCreateValidation): Promise<RoleDocument> {
        const create: RoleDocument = new this.roleModel({
            name: name,
            permissions: permissions.map((val) => new Types.ObjectId(val)),
            isActive: true,
            isAdmin: isAdmin || false,
        });

        return create.save();
    }

    async update(
        _id: string,
        { name, permissions, isAdmin }: RoleUpdateValidation
    ): Promise<RoleDocument> {
        const update: RoleDocument = await this.roleModel.findById(_id);
        update.name = name;
        update.permissions = permissions.map((val) => new Types.ObjectId(val));
        update.isAdmin = isAdmin || false;

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

    async mapGet(data: IRoleDocument): Promise<RoleGetTransformer> {
        return plainToInstance(RoleGetTransformer, data);
    }

    async mapList(data: RoleDocument[]): Promise<RoleListTransformer[]> {
        return plainToInstance(RoleListTransformer, data);
    }
}

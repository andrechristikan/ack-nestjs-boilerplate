import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PermissionEntity } from 'src/permission/permission.schema';
import { IRoleCreate, RoleDocument } from './role.interface';
import { RoleEntity } from './role.schema';

@Injectable()
export class RoleService {
    constructor(
        @InjectModel(RoleEntity.name)
        private readonly roleModel: Model<RoleDocument>
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: Record<string, any>
    ): Promise<RoleDocument[]> {
        const roles = this.roleModel.find(find);
        if (options && options.limit && options.skip) {
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
                model: PermissionEntity.name
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
                model: PermissionEntity.name
            });
        }

        return role.lean();
    }

    async create({
        name,
        permissions,
        isActive
    }: IRoleCreate): Promise<RoleDocument> {
        const create: RoleDocument = new this.roleModel({
            name: name,
            permissions: permissions.map((val) => new Types.ObjectId(val)),
            isActive: isActive ? isActive : true
        });

        return create.save();
    }

    async deleteOneById(_id: string): Promise<RoleDocument> {
        return this.roleModel.deleteOne({
            _id: new Types.ObjectId(_id)
        });
    }

    async deleteMany(find: Record<string, any>): Promise<boolean> {
        await this.roleModel.deleteMany(find);
        return true;
    }

    async createMany(data: IRoleCreate[]): Promise<boolean> {
        await this.roleModel.insertMany(
            data.map(({ name, isActive, permissions }) => ({
                name,
                isActive: isActive ? isActive : true,
                permissions: permissions.map((val) => Types.ObjectId(val))
            }))
        );
        return true;
    }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PermissionEntity } from 'src/permission/permission.schema';
import { RoleDocument } from './role.interface';
import { RoleEntity } from './role.schema';

@Injectable()
export class RoleService {
    constructor(
        @InjectModel(RoleEntity.name)
        private readonly roleModel: Model<RoleDocument>
    ) {}

    async findAll<T>(
        find?: Record<string, any>,
        options?: Record<string, any>
    ): Promise<T[]> {
        const findAll = this.roleModel
            .find(find)
            .select('-__v')
            .skip(options && options.skip ? options.skip : 0);

        if (options && options.limit) {
            findAll.limit(options.limit);
        }

        if (options && options.populate) {
            findAll.populate({
                path: 'permissions',
                model: PermissionEntity.name,
                match: { isActive: true },
                select: '-__v'
            });
        }

        return findAll.lean();
    }

    async totalData(find?: Record<string, any>): Promise<number> {
        return this.roleModel.countDocuments(find);
    }

    async findOneById<T>(roleId: string, populate?: boolean): Promise<T> {
        const role = this.roleModel.findById(roleId).select('-__v');

        if (populate) {
            role.populate({
                path: 'permissions',
                model: PermissionEntity.name,
                match: { isActive: true }
            });
        }

        return role.lean();
    }

    async findOne<T>(
        find?: Record<string, any>,
        populate?: boolean
    ): Promise<T> {
        const role = this.roleModel.findOne(find).select('-__v');

        if (populate) {
            role.populate({
                path: 'permissions',
                model: PermissionEntity.name,
                match: { isActive: true },
                select: '-__v'
            });
        }

        return role.lean();
    }

    async create(data: Record<string, any>): Promise<RoleDocument> {
        const create: RoleDocument = new this.roleModel({
            name: data.name,
            permissions: data.permissions,
            isActive: true,
            select: '-__v'
        });

        return create.save();
    }

    // For migration
    async deleteMany(find?: Record<string, any>): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.roleModel
                .deleteMany(find)
                .then(() => {
                    resolve(true);
                })
                .catch((err: any) => {
                    reject(err);
                });
        });
    }

    async createMany(data: Record<string, any>[]): Promise<boolean> {
        const newData = data.map((val: Record<string, any>) => ({
            name: val.name,
            permissions: val.permissions,
            isActive: true
        }));

        return new Promise((resolve, reject) => {
            this.roleModel
                .insertMany(newData)
                .then(() => {
                    resolve(true);
                })
                .catch((err: any) => {
                    reject(err);
                });
        });
    }
}

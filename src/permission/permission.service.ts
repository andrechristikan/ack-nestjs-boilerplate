import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IPermission, PermissionDocument } from './permission.interface';
import { PermissionEntity } from './permission.schema';

@Injectable()
export class PermissionService {
    constructor(
        @InjectModel(PermissionEntity.name)
        private readonly permissionModel: Model<PermissionDocument>
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: Record<string, any>
    ): Promise<PermissionDocument[]> {
        const findAll = this.permissionModel.find(find);
        if (options && options.limit && options.skip) {
            findAll
                .limit(options.limit)
                .skip(options && options.skip ? options.skip : 0);
        }

        if (options && options.sort) {
            findAll.sort(options.sort);
        }

        return findAll.lean();
    }

    async findOne(find?: Record<string, any>): Promise<PermissionDocument> {
        return this.permissionModel.findOne(find).lean();
    }

    async getTotal(find?: Record<string, any>): Promise<number> {
        return this.permissionModel.countDocuments(find);
    }

    async deleteMany(find: Record<string, any>): Promise<boolean> {
        await this.permissionModel.deleteMany(find);
        return true;
    }

    async createMany(data: IPermission[]): Promise<boolean> {
        await this.permissionModel.insertMany(
            data.map(({ isActive, name }) => ({
                name,
                isActive: isActive ? isActive : true
            }))
        );
        return true;
    }
}

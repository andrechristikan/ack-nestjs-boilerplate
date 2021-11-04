import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IPermissionCreate, PermissionDocument } from './permission.interface';
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
        const findAll = this.permissionModel
            .find(find)
            .skip(options && options.skip ? options.skip : 0);

        if (options && options.limit) {
            findAll.limit(options.limit);
        }

        return findAll.lean();
    }

    async findOne(find?: Record<string, any>): Promise<PermissionDocument> {
        return this.permissionModel.findOne(find).lean();
    }

    async getTotalData(find?: Record<string, any>): Promise<number> {
        return this.permissionModel.countDocuments(find);
    }

    async create(data: IPermissionCreate): Promise<PermissionDocument> {
        const create: PermissionDocument = new this.permissionModel({
            name: data.name,
            isActive: true
        });

        return create.save();
    }

    async deleteMany(find: Record<string, any>): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.permissionModel
                .deleteMany(find)
                .then(() => {
                    resolve(true);
                })
                .catch((err: any) => {
                    reject(err);
                });
        });
    }

    async createMany(data: IPermissionCreate[]): Promise<boolean> {
        const newData = data.map((val: IPermissionCreate) => ({
            name: val.name,
            isActive: true
        }));

        return new Promise((resolve, reject) => {
            this.permissionModel
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

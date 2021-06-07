import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoleDocument } from './role.interface';
import { RoleEntity } from './role.schema';

@Injectable()
export class RoleService {
    constructor(
        @InjectModel(RoleEntity.name)
        private readonly roleModel: Model<RoleDocument>
    ) {}

    async findAll(
        offset: number,
        limit: number,
        find?: Record<string, any>
    ): Promise<RoleDocument[]> {
        return this.roleModel.find(find).skip(offset).limit(limit).limit(1);
    }

    async create(data: Record<string, any>): Promise<RoleDocument> {
        const create: RoleDocument = new this.roleModel({
            name: data.name,
            permissions: data.permissions,
            isActive: true
        });

        return create.save();
    }

    async delete(find?: Record<string, any>): Promise<boolean> {
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

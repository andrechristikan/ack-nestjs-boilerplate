import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { IPermission, PermissionDocument } from './permission.interface';
import { PermissionEntity } from './permission.schema';
import { PermissionGetTransformer } from './transformer/permission.get.transformer';
import { PermissionListTransformer } from './transformer/permission.list.transformer';
import { PermissionUpdateValidation } from './validation/permission.update.validation';

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

    async findOneById(_id: string): Promise<PermissionDocument> {
        return this.permissionModel.findById(_id).lean();
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

    async create(data: IPermission): Promise<PermissionDocument> {
        const create: PermissionDocument = new this.permissionModel({
            name: data.name,
            code: data.code,
            description: data.description,
            isActive: data.isActive || true
        });

        return create.save();
    }

    async createMany(data: IPermission[]): Promise<boolean> {
        await this.permissionModel.insertMany(
            data.map(({ isActive, code, description, name }) => ({
                code: code,
                name: name,
                description: description,
                isActive: isActive || true
            }))
        );
        return true;
    }

    async update(
        _id: string,
        { name, description }: PermissionUpdateValidation
    ): Promise<PermissionDocument> {
        const permission = await this.permissionModel.findById(_id);

        permission.name = name;
        permission.description = description;
        return permission.save();
    }

    async mapGet(data: PermissionDocument): Promise<PermissionGetTransformer> {
        return plainToInstance(PermissionGetTransformer, data);
    }

    async mapList(
        data: PermissionDocument[]
    ): Promise<PermissionListTransformer[]> {
        return plainToInstance(PermissionListTransformer, data);
    }

    async inactive(_id: string): Promise<PermissionDocument> {
        const permission: PermissionDocument =
            await this.permissionModel.findById(_id);

        permission.isActive = false;
        return permission.save();
    }

    async active(_id: string): Promise<PermissionDocument> {
        const permission: PermissionDocument =
            await this.permissionModel.findById(_id);

        permission.isActive = true;
        return permission.save();
    }
}
